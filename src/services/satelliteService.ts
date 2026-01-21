/**
 * Satellite Imagery Service
 * Uses Copernicus Data Space Sentinel Hub API for NDVI and satellite imagery
 * Free tier with no hectare limits!
 */

// Copernicus Data Space OAuth credentials
const COPERNICUS_CLIENT_ID = 'sh-11c9ea5e-2705-46e4-8d84-1d2193e18d60';
const COPERNICUS_CLIENT_SECRET = 'tD32wvcf3ZHU45rNFxeCxrZ4vCipvR1R';

// Using public CORS proxy to bypass browser restrictions
const CORS_PROXY = 'https://corsproxy.io/?';
const COPERNICUS_TOKEN_URL = `${CORS_PROXY}https://identity.dataspace.copernicus.eu/auth/realms/CDSE/protocol/openid-connect/token`;
const SENTINEL_HUB_URL = `${CORS_PROXY}https://sh.dataspace.copernicus.eu/api/v1`;

// Cache for access token
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

export interface NDVIStats {
  min: number;
  max: number;
  mean: number;
  median: number;
}

/**
 * Get OAuth access token from Copernicus Data Space
 */
async function getAccessToken(): Promise<string | null> {
  // Return cached token if still valid
  if (accessToken && Date.now() < tokenExpiry) {
    return accessToken;
  }

  try {
    const response = await fetch(COPERNICUS_TOKEN_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: COPERNICUS_CLIENT_ID,
        client_secret: COPERNICUS_CLIENT_SECRET
      })
    });

    if (!response.ok) {
      console.error('Failed to get Copernicus access token:', response.status);
      return null;
    }

    const data = await response.json();
    accessToken = data.access_token;
    // Set expiry 5 minutes before actual expiry
    tokenExpiry = Date.now() + (data.expires_in - 300) * 1000;
    
    return accessToken;
  } catch (error) {
    console.error('Error getting Copernicus access token:', error);
    return null;
  }
}

/**
 * Search for available Sentinel-2 images in a date range
 */
export async function searchSentinelImages(
  bbox: [number, number, number, number], // [minLng, minLat, maxLng, maxLat]
  startDate: Date,
  endDate: Date,
  maxCloudCover: number = 30
): Promise<SatelliteImage[]> {
  const token = await getAccessToken();
  if (!token) return [];

  try {
    // Format dates as ISO 8601 strings (required by STAC API)
    const fromDate = startDate.toISOString();
    const toDate = endDate.toISOString();
    const timeRange = `${fromDate}/${toDate}`;
    
    const requestBody = {
      bbox: bbox,
      datetime: timeRange,
      collections: ['sentinel-2-l2a'],
      limit: 20,
      filter: `eo:cloud_cover < ${maxCloudCover}`
    };

    const response = await fetch(`${SENTINEL_HUB_URL}/catalog/1.0.0/search`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      console.error('Sentinel image search failed:', response.status);
      return [];
    }

    const data = await response.json();
    
    return (data.features || []).map((feature: any) => ({
      dt: new Date(feature.properties.datetime).getTime() / 1000,
      date: new Date(feature.properties.datetime).toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: 'short'
      }),
      type: 's2',
      dc: 100,
      cl: feature.properties['eo:cloud_cover'] || 0,
      imageUrl: feature.id
    }));
  } catch (error) {
    console.error('Error searching Sentinel images:', error);
    return [];
  }
}

/**
 * Generate NDVI image URL for a polygon
 * Uses Sentinel Hub Process API with evalscript
 */
export async function getNDVIImage(
  polygon: any, // GeoJSON polygon
  date: string, // YYYY-MM-DD
  width: number = 512,
  height: number = 512
): Promise<string | null> {
  const token = await getAccessToken();
  if (!token) return null;

  // NDVI evalscript - calculates NDVI and applies color palette
  const evalscript = `
//VERSION=3
function setup() {
  return {
    input: [{
      bands: ["B04", "B08", "SCL"],
      units: "DN"
    }],
    output: {
      bands: 4,
      sampleType: "AUTO"
    }
  };
}

function evaluatePixel(sample) {
  // Skip clouds and shadows
  if (sample.SCL == 3 || sample.SCL == 8 || sample.SCL == 9 || sample.SCL == 10) {
    return [0, 0, 0, 0];
  }
  
  let ndvi = (sample.B08 - sample.B04) / (sample.B08 + sample.B04);
  
  // Color palette: red -> yellow -> green
  if (ndvi < 0) return [0.5, 0.2, 0.1, 1]; // Brown - no vegetation
  if (ndvi < 0.2) return [0.8, 0.3, 0.1, 1]; // Red - very low
  if (ndvi < 0.3) return [1, 0.5, 0, 1]; // Orange - low
  if (ndvi < 0.4) return [1, 0.8, 0, 1]; // Yellow - moderate low
  if (ndvi < 0.5) return [0.8, 1, 0, 1]; // Yellow-green - moderate
  if (ndvi < 0.6) return [0.5, 0.9, 0.2, 1]; // Light green - good
  if (ndvi < 0.7) return [0.2, 0.8, 0.2, 1]; // Green - very good
  if (ndvi < 0.8) return [0.1, 0.6, 0.1, 1]; // Dark green - excellent
  return [0, 0.4, 0, 1]; // Very dark green - dense
}
`;

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
            properties: {
              crs: 'http://www.opengis.net/def/crs/EPSG/0/4326'
            }
          },
          data: [{
            type: 'sentinel-2-l2a',
            dataFilter: {
              timeRange: {
                from: `${date}T00:00:00Z`,
                to: `${date}T23:59:59Z`
              },
              maxCloudCoverage: 50
            }
          }]
        },
        output: {
          width: width,
          height: height,
          responses: [{
            identifier: 'default',
            format: { type: 'image/png' }
          }]
        },
        evalscript: evalscript
      })
    });

    if (!response.ok) {
      console.error('NDVI image request failed:', response.status);
      return null;
    }

    // Convert response to blob URL
    const blob = await response.blob();
    return URL.createObjectURL(blob);
  } catch (error) {
    console.error('Error getting NDVI image:', error);
    return null;
  }
}

/**
 * Generate True Color image for a polygon
 */
export async function getTrueColorImage(
  polygon: any,
  date: string,
  width: number = 512,
  height: number = 512
): Promise<string | null> {
  const token = await getAccessToken();
  if (!token) return null;

  const evalscript = `
//VERSION=3
function setup() {
  return {
    input: ["B04", "B03", "B02"],
    output: { bands: 3, sampleType: "AUTO" }
  };
}

function evaluatePixel(sample) {
  return [2.5 * sample.B04, 2.5 * sample.B03, 2.5 * sample.B02];
}
`;

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
            properties: {
              crs: 'http://www.opengis.net/def/crs/EPSG/0/4326'
            }
          },
          data: [{
            type: 'sentinel-2-l2a',
            dataFilter: {
              timeRange: {
                from: `${date}T00:00:00Z`,
                to: `${date}T23:59:59Z`
              },
              maxCloudCoverage: 50
            }
          }]
        },
        output: {
          width: width,
          height: height,
          responses: [{
            identifier: 'default',
            format: { type: 'image/png' }
          }]
        },
        evalscript: evalscript
      })
    });

    if (!response.ok) {
      console.error('True color image request failed:', response.status);
      return null;
    }

    const blob = await response.blob();
    return URL.createObjectURL(blob);
  } catch (error) {
    console.error('Error getting true color image:', error);
    return null;
  }
}

/**
 * Generate EVI (Enhanced Vegetation Index) image
 * Formula: 2.5 * ((NIR - RED) / (NIR + 6 * RED - 7.5 * BLUE + 1))
 */
export async function getEVIImage(
  polygon: any,
  date: string,
  width: number = 512,
  height: number = 512
): Promise<string | null> {
  const token = await getAccessToken();
  if (!token) return null;

  const evalscript = `
//VERSION=3
function setup() {
  return {
    input: ["B04", "B08", "B02", "SCL"],
    output: { bands: 4, sampleType: "AUTO" }
  };
}

function evaluatePixel(sample) {
  // Skip clouds
  if (sample.SCL == 3 || sample.SCL == 8 || sample.SCL == 9 || sample.SCL == 10) {
    return [0, 0, 0, 0];
  }

  let nir = sample.B08;
  let red = sample.B04;
  let blue = sample.B02;

  // EVI Formula
  let denominator = nir + 6 * red - 7.5 * blue + 1;
  let evi = (denominator == 0) ? 0 : 2.5 * ((nir - red) / denominator);

  // Visualization palette (similar to NDVI but optimized for high biomass)
  if (evi < 0) return [0.5, 0.2, 0.1, 1]; // Brown
  if (evi < 0.2) return [0.8, 0.3, 0.1, 1]; // Red
  if (evi < 0.3) return [1, 0.5, 0, 1]; // Orange
  if (evi < 0.4) return [1, 0.8, 0, 1]; // Yellow
  if (evi < 0.5) return [0.8, 1, 0, 1]; // Yellow-green
  if (evi < 0.6) return [0.5, 0.9, 0.2, 1]; // Light green
  if (evi < 0.7) return [0.2, 0.8, 0.2, 1]; // Green
  return [0, 0.4, 0, 1]; // Dark green
}
`;

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
              timeRange: {
                from: `${date}T00:00:00Z`,
                to: `${date}T23:59:59Z`
              },
              maxCloudCoverage: 50
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

    if (!response.ok) {
      console.error('EVI image request failed:', response.status);
      return null;
    }

    const blob = await response.blob();
    return URL.createObjectURL(blob);
  } catch (error) {
    console.error('Error getting EVI image:', error);
    return null;
  }
}

/**
 * Get available dates with Sentinel-2 imagery for a polygon
 */
export async function getAvailableDates(
  polygon: any,
  days: number = 30
): Promise<string[]> {
  const token = await getAccessToken();
  if (!token) return [];

  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  // Get bounding box from polygon
  const coords = polygon.geometry?.coordinates[0] || polygon.coordinates[0];
  const lngs = coords.map((c: number[]) => c[0]);
  const lats = coords.map((c: number[]) => c[1]);
  const bbox: [number, number, number, number] = [
    Math.min(...lngs),
    Math.min(...lats),
    Math.max(...lngs),
    Math.max(...lats)
  ];

  const images = await searchSentinelImages(bbox, startDate, endDate, 50);
  return images.map(img => {
    const d = new Date(img.dt * 1000);
    return d.toISOString().split('T')[0];
  });
}

/**
 * NDVI color palette definition for legend
 */
export const NDVI_PALETTE = [
  { value: 0.0, color: '#8B4513', label: 'Sem vegetação' },
  { value: 0.2, color: '#CD4F39', label: 'Muito baixa' },
  { value: 0.3, color: '#FF8C00', label: 'Baixa' },
  { value: 0.4, color: '#FFD700', label: 'Moderada' },
  { value: 0.5, color: '#ADFF2F', label: 'Moderada-alta' },
  { value: 0.6, color: '#7CFC00', label: 'Boa' },
  { value: 0.7, color: '#32CD32', label: 'Muito boa' },
  { value: 0.8, color: '#228B22', label: 'Excelente' },
  { value: 1.0, color: '#006400', label: 'Densa' },
];

/**
 * Get color for a specific NDVI value
 */
export function getNDVIColor(value: number): string {
  for (let i = NDVI_PALETTE.length - 1; i >= 0; i--) {
    if (value >= NDVI_PALETTE[i].value) {
      return NDVI_PALETTE[i].color;
    }
  }
  return NDVI_PALETTE[0].color;
}

/**
 * Get label for a specific NDVI value
 */
export function getNDVILabel(value: number): string {
  for (let i = NDVI_PALETTE.length - 1; i >= 0; i--) {
    if (value >= NDVI_PALETTE[i].value) {
      return NDVI_PALETTE[i].label;
    }
  }
  return NDVI_PALETTE[0].label;
}
