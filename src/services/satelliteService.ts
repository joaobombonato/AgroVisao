/**
 * Satellite Imagery Service
 * Uses Copernicus Data Space Sentinel Hub API for NDVI and satellite imagery
 * Free tier with no hectare limits!
 */

// Copernicus Data Space OAuth credentials
const COPERNICUS_CLIENT_ID = 'sh-11c9ea5e-2705-46e4-8d84-1d2193e18d60';
const COPERNICUS_CLIENT_SECRET = 'tD32wvcf3ZHU45rNFxeCxrZ4vCipvR1R';

const CORS_PROXY = 'https://corsproxy.io/?';
const COPERNICUS_TOKEN_URL = `${CORS_PROXY}https://identity.dataspace.copernicus.eu/auth/realms/CDSE/protocol/openid-connect/token`;
const SENTINEL_HUB_URL = `${CORS_PROXY}https://sh.dataspace.copernicus.eu/api/v1`;

let accessToken: string | null = null;
let tokenExpiry: number = 0;

export interface SatelliteImage {
  dt: number;
  date: string;
  type: string;
  dc: number;
  cl: number;
  imageUrl: string;
}

// Lógica de Detecção de Água (NDWI) para "limpar" os índices
// Formula: (Green - NIR) / (Green + NIR) -> (B03 - B08) / (B03 + B08)
// Se o valor for > 0, é água.
const WATER_CHECK = `
  let ndwi = (sample.B03 - sample.B08) / (sample.B03 + sample.B08);
  if (ndwi > 0) return [0, 0.23, 0.71, 1]; // Azul Profundo para Água (Lagoas)
`;

// Paleta Oficial AgroVisão (0.0 - 1.0)
const PALETTE_VIGOR = `
  if (val < 0) return [0.55, 0.27, 0.07, 1];    // #8B4513
  if (val < 0.2) return [0.80, 0.31, 0.22, 1];  // #CD4F39
  if (val < 0.3) return [1.00, 0.55, 0.00, 1];  // #FF8C00
  if (val < 0.4) return [1.00, 0.84, 0.00, 1];  // #FFD700
  if (val < 0.5) return [0.68, 1.00, 0.18, 1];  // #ADFF2F
  if (val < 0.6) return [0.49, 0.99, 0.00, 1];  // #7CFC00
  if (val < 0.7) return [0.20, 0.80, 0.20, 1];  // #32CD32
  if (val < 0.8) return [0.13, 0.55, 0.13, 1];  // #228B22
  return [0.00, 0.39, 0.00, 1];                 // #006400
`;

async function getAccessToken(): Promise<string | null> {
  if (accessToken && Date.now() < tokenExpiry) return accessToken;
  try {
    const response = await fetch(COPERNICUS_TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: COPERNICUS_CLIENT_ID,
        client_secret: COPERNICUS_CLIENT_SECRET
      })
    });
    if (!response.ok) return null;
    const data = await response.json();
    accessToken = data.access_token;
    tokenExpiry = Date.now() + (data.expires_in - 300) * 1000;
    return accessToken;
  } catch (error) { return null; }
}

async function processSentinelImage(
  polygon: any,
  date: string,
  width: number,
  height: number,
  evalscript: string,
  token: string
): Promise<string | null> {
  try {
    const response = await fetch(`${SENTINEL_HUB_URL}/process`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Accept': 'image/png'
      },
      body: JSON.stringify({
        input: {
          bounds: {
            geometry: polygon.geometry || polygon,
            properties: { crs: 'http://www.opengis.net/def/crs/EPSG/0/4326' }
          },
          data: [{
            type: 'sentinel-2-l2a',
            dataFilter: {
              timeRange: { from: `${date}T00:00:00Z`, to: `${date}T23:59:59Z` },
              maxCloudCoverage: 100
            }
          }]
        },
        output: {
          width: width,
          height: height,
          responses: [{ identifier: 'default', format: { type: 'image/png' } }]
        },
        evalscript: evalscript
      })
    });
    if (!response.ok) return null;
    const blob = await response.blob();
    return URL.createObjectURL(blob);
  } catch (error) { return null; }
}

export async function getSAVIImage(p: any, d: string, w: number = 512, h: number = 512) {
  const t = await getAccessToken(); if (!t) return null;
  const evalscript = `//VERSION=3
function setup() { return { input: ["B04", "B08", "B03", "SCL"], output: { bands: 4, sampleType: "AUTO" } }; }
function evaluatePixel(sample) {
  if (sample.SCL == 3 || sample.SCL == 8 || sample.SCL == 9 || sample.SCL == 10) return [0, 0, 0, 0];
  ${WATER_CHECK}
  let nir = sample.B08; let red = sample.B04; let L = 0.5;
  let val = ((nir - red) / (nir + red + L)) * (1 + L);
  ${PALETTE_VIGOR}
}`;
  return processSentinelImage(p, d, w, h, evalscript, t);
}

export async function getNDVIImage(p: any, d: string, w: number = 512, h: number = 512) {
  const t = await getAccessToken(); if (!t) return null;
  const evalscript = `//VERSION=3
function setup() { return { input: ["B04", "B08", "B03", "SCL"], output: { bands: 4, sampleType: "AUTO" } }; }
function evaluatePixel(sample) {
  if (sample.SCL == 3 || sample.SCL == 8 || sample.SCL == 9 || sample.SCL == 10) return [0, 0, 0, 0];
  ${WATER_CHECK}
  let val = (sample.B08 - sample.B04) / (sample.B08 + sample.B04);
  ${PALETTE_VIGOR}
}`;
  return processSentinelImage(p, d, w, h, evalscript, t);
}

export async function getEVIImage(p: any, d: string, w: number = 512, h: number = 512) {
  const t = await getAccessToken(); if (!t) return null;
  const evalscript = `//VERSION=3
function setup() { return { input: ["B04", "B08", "B02", "B03", "SCL"], output: { bands: 4, sampleType: "AUTO" } }; }
function evaluatePixel(sample) {
  if (sample.SCL == 3 || sample.SCL == 8 || sample.SCL == 9 || sample.SCL == 10) return [0, 0, 0, 0];
  ${WATER_CHECK}
  let nir = sample.B08; let red = sample.B04; let blue = sample.B02;
  let denominator = nir + 6 * red - 7.5 * blue + 1;
  let val = (denominator == 0) ? 0 : 2.5 * ((nir - red) / denominator);
  ${PALETTE_VIGOR}
}`;
  return processSentinelImage(p, d, w, h, evalscript, t);
}

export async function getNDREImage(p: any, d: string, w: number = 512, h: number = 512) {
  const t = await getAccessToken(); if (!t) return null;
  const evalscript = `//VERSION=3
function setup() { return { input: ["B08", "B05", "B03", "SCL"], output: { bands: 4, sampleType: "AUTO" } }; }
function evaluatePixel(sample) {
  if (sample.SCL == 3 || sample.SCL == 8 || sample.SCL == 9 || sample.SCL == 10) return [0, 0, 0, 0];
  ${WATER_CHECK}
  let val = (sample.B08 - sample.B05) / (sample.B08 + sample.B05);
  ${PALETTE_VIGOR}
}`;
  return processSentinelImage(p, d, w, h, evalscript, t);
}

export async function getNDMIImage(p: any, d: string, w: number = 512, h: number = 512) {
  const t = await getAccessToken(); if (!t) return null;
  const evalscript = `//VERSION=3
function setup() { return { input: ["B08", "B11", "B03", "SCL"], output: { bands: 4, sampleType: "AUTO" } }; }
function evaluatePixel(sample) {
  if (sample.SCL == 3 || sample.SCL == 8 || sample.SCL == 9 || sample.SCL == 10) return [0, 0, 0, 0];
  ${WATER_CHECK}
  let ndmi = (sample.B08 - sample.B11) / (sample.B08 + sample.B11);
  if (ndmi < -0.2) return [1, 0.27, 0.07, 1];    // Dry (Orange-Red)
  if (ndmi < 0) return [1, 0.84, 0.00, 1];       // Low (Yellow)
  if (ndmi < 0.2) return [0.68, 1, 1, 1];        // Moderate (Light Blue)
  if (ndmi < 0.4) return [0.12, 0.56, 1, 1];     // High (Blue)
  return [0, 0.23, 0.71, 1];                    // Very high (Deep Blue)
}`;
  return processSentinelImage(p, d, w, h, evalscript, t);
}

export async function getTrueColorImage(p: any, d: string, w: number = 512, h: number = 512) {
  const t = await getAccessToken(); if (!t) return null;
  const evalscript = `//VERSION=3
function setup() { return { input: ["B04", "B03", "B02", "SCL"], output: { bands: 4, sampleType: "AUTO" } }; }
function evaluatePixel(sample) {
  const gain = 5.5;
  return [ 
    Math.min(sample.B04 * gain, 1), 
    Math.min(sample.B03 * gain, 1), 
    Math.min(sample.B02 * gain, 1),
    1 
  ];
}`;
  return processSentinelImage(p, d, w, h, evalscript, t);
}

export async function searchSentinelImages(bbox: [number, number, number, number], startDate: Date, endDate: Date, maxCloudCover: number = 100): Promise<SatelliteImage[]> {
  const token = await getAccessToken(); if (!token) return [];
  try {
    const timeRange = `${startDate.toISOString()}/${endDate.toISOString()}`;
    const response = await fetch(`${SENTINEL_HUB_URL}/catalog/1.0.0/search`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ bbox, datetime: timeRange, collections: ['sentinel-2-l2a'], limit: 100, filter: `eo:cloud_cover < ${maxCloudCover}` })
    });
    if (!response.ok) return [];
    const data = await response.json();
    return (data.features || []).map((f: any) => ({
      dt: new Date(f.properties.datetime).getTime() / 1000,
      date: new Date(f.properties.datetime).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }),
      type: 's2', dc: 100, cl: f.properties['eo:cloud_cover'] || 0, imageUrl: f.id
    }));
  } catch (error) { return []; }
}

export async function getAvailableDates(polygon: any, days: number = 400): Promise<{ date: string, cloudCover: number }[]> {
  const now = new Date();
  const midDate = new Date(); midDate.setDate(now.getDate() - 200);
  const startDate = new Date(); startDate.setDate(now.getDate() - days);
  const coords = polygon.geometry?.coordinates[0] || polygon.coordinates[0];
  const lngs = coords.map((c: any) => c[0]); const lats = coords.map((c: any) => c[1]);
  const bbox: [number, number, number, number] = [Math.min(...lngs), Math.min(...lats), Math.max(...lngs), Math.max(...lats)];
  try {
    const [recent, older] = await Promise.all([
      searchSentinelImages(bbox, midDate, now, 100),
      searchSentinelImages(bbox, startDate, midDate, 100)
    ]);
    const all = [...recent, ...older].map(i => ({
      date: new Date(i.dt * 1000).toISOString().split('T')[0],
      cloudCover: i.cl
    }));
    const unique = all.reduce((acc: any[], curr) => {
      const ex = acc.find(i => i.date === curr.date);
      if (!ex) acc.push(curr); else if (curr.cloudCover < ex.cloudCover) ex.cloudCover = curr.cloudCover;
      return acc;
    }, []);
    return unique.sort((a, b) => b.date.localeCompare(a.date));
  } catch (e) { return []; }
}
