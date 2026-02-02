/**
 * Agronomic Data Service (Open-Meteo)
 * Specialized in agricultural weather data: Soil Moisture, Evapotranspiration.
 * Limit: Free for non-commercial use (up to 10k daily calls).
 */

const CACHE_TTL = 45 * 60 * 1000; // 45 minutes cache

export interface AgronomicData {
  date: string;
  // Soil moisture at different depths (m³/m³)
  soilMoisture0to1cm: number;
  soilMoisture3to9cm: number;
  soilMoisture9to27cm: number;
  soilMoisture27to81cm: number;
  // Atmospheric metrics
  evapotranspiration: number; // mm
  precipitation: number;      // mm
  vpd: number;               // Vapor Pressure Deficit (kPa) - Higher means more plant stress
  gdd: number;               // Daily Growing Degree Days
  accumulatedGdd: number;    // Accumulated over the period
  waterBalance: number;      // Daily (Precip - ET0)
  cumulativeBalance: number; // Cumulative focus
}

export interface AgronomicResult {
  current: AgronomicData;
  daily: AgronomicData[];
  todayIndex: number;
  periodSummary: {
    totalPrecipitation: number;
    totalET0: number;
    finalBalance: number;
    totalGdd: number;
  };
}

export async function fetchAgronomicData(lat: number, lng: number): Promise<AgronomicResult | null> {
  const cacheKey = `agronomic_om_v21hist_cache_${lat.toFixed(3)}_${lng.toFixed(3)}`;
  
  // 1. Try Cache
  try {
    const cachedStr = localStorage.getItem(cacheKey);
    if (cachedStr) {
      const cached = JSON.parse(cachedStr);
      if (Date.now() - cached.timestamp < CACHE_TTL) {
        return cached.data;
      }
    }
  } catch (err) {
    console.warn('Agro Cache error:', err);
  }

  try {
    // Open-Meteo Agriculture API variables for professional grain monitoring
    const params = new URLSearchParams({
      latitude: lat.toString(),
      longitude: lng.toString(),
      hourly: [
        'soil_moisture_0_to_1cm',
        'soil_moisture_3_to_9cm',
        'soil_moisture_9_to_27cm',
        'soil_moisture_27_to_81cm',
        'et0_fao_evapotranspiration',
        'precipitation',
        'vapor_pressure_deficit',
        'temperature_2m'
      ].join(','),
      timezone: 'America/Sao_Paulo',
      past_days: '21',
      forecast_days: '15'
    });

    const response = await fetch(`https://api.open-meteo.com/v1/forecast?${params}`);
    
    if (!response.ok) {
        throw new Error(`Open-Meteo Agro API error: ${response.status}`);
    }

    const data = await response.json();
    const hourly = data.hourly;
    
    // Group hourly data by date string
    const dailyMap = new Map<string, {
        temps: number[],
        et0: number,
        precip: number,
        vpd: number,
        sm0_1: number,
        sm3_9: number,
        sm9_27: number,
        sm27_81: number
    }>();

    for (let h = 0; h < hourly.time.length; h++) {
        const dateStr = hourly.time[h].split('T')[0];
        if (!dailyMap.has(dateStr)) {
            dailyMap.set(dateStr, {
                temps: [], et0: 0, precip: 0, vpd: 0,
                sm0_1: 0, sm3_9: 0, sm9_27: 0, sm27_81: 0
            });
        }
        const day = dailyMap.get(dateStr)!;
        day.temps.push(hourly.temperature_2m[h]);
        day.et0 += hourly.et0_fao_evapotranspiration[h] || 0;
        day.precip += hourly.precipitation[h] || 0;
        day.vpd += hourly.vapor_pressure_deficit[h] || 0;
        
        // Use noon (index 12 of the day) or closest available for soil moisture snapshot
        const hour = parseInt(hourly.time[h].split('T')[1].split(':')[0]);
        if (hour === 12) {
            day.sm0_1 = hourly.soil_moisture_0_to_1cm[h];
            day.sm3_9 = hourly.soil_moisture_3_to_9cm[h];
            day.sm9_27 = hourly.soil_moisture_9_to_27cm[h];
            day.sm27_81 = hourly.soil_moisture_27_to_81cm[h];
        }
    }

    const dailyData: AgronomicData[] = [];
    let totalAccumulatedGdd = 0;
    let runningWaterBalance = 0;
    const TBASE = 10;

    // Convert map to sorted dailyData array
    const sortedDates = Array.from(dailyMap.keys()).sort();
    
    for (const date of sortedDates) {
        const d = dailyMap.get(date)!;
        
        const tMax = Math.max(...d.temps);
        const tMin = Math.min(...d.temps);
        const dailyGdd = Math.max(0, ((tMax + tMin) / 2) - TBASE);
        totalAccumulatedGdd += dailyGdd;

        const dailyBalance = d.precip - d.et0;
        runningWaterBalance += dailyBalance;

        dailyData.push({
            date,
            soilMoisture0to1cm: d.sm0_1,
            soilMoisture3to9cm: d.sm3_9,
            soilMoisture9to27cm: d.sm9_27,
            soilMoisture27to81cm: d.sm27_81,
            evapotranspiration: parseFloat(d.et0.toFixed(2)),
            precipitation: parseFloat(d.precip.toFixed(2)),
            vpd: parseFloat((d.vpd / d.temps.length).toFixed(2)),
            gdd: dailyGdd,
            accumulatedGdd: totalAccumulatedGdd,
            waterBalance: dailyBalance,
            cumulativeBalance: runningWaterBalance
        });
    }

    // Dynamic detection of "Today" in Sao Paulo
    const now = new Date();
    const formatter = new Intl.DateTimeFormat('en-CA', { 
        timeZone: 'America/Sao_Paulo', 
        year: 'numeric', 
        month: '2-digit', 
        day: '2-digit' 
    });
    const todayStr = formatter.format(now);
    
    let todayIndex = dailyData.findIndex(d => d.date === todayStr);
    
    // Safety fallback
    if (todayIndex === -1) {
        // Find closest date to today if not exact match (unlikely but safe)
        todayIndex = dailyData.findIndex(d => d.date > todayStr) - 1;
        if (todayIndex < 0) todayIndex = 21; 
    }

    const currentDay = dailyData[todayIndex] || dailyData[0];

    const result: AgronomicResult = {
      current: currentDay,
      daily: dailyData,
      todayIndex: todayIndex,
      periodSummary: {
        totalPrecipitation: dailyData.reduce((acc, d) => acc + d.precipitation, 0),
        totalET0: dailyData.reduce((acc, d) => acc + d.evapotranspiration, 0),
        finalBalance: runningWaterBalance,
        totalGdd: totalAccumulatedGdd
      }
    };

    // 2. Save Cache
    try {
      localStorage.setItem(cacheKey, JSON.stringify({
        timestamp: Date.now(),
        data: result
      }));
    } catch (err) {
       console.warn('Agro Cache save error:', err);
    }

    return result;

  } catch (error) {
    console.error('Agronomic fetch error:', error);
    return null;
  }
}
