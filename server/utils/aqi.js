// ============================================
// AeroStreet-AI — CPCB Indian AQI Calculation Utilities
// ============================================

/**
 * National Air Quality Index (NAAQS) sub-index calculation for PM2.5 (ug/m3)
 * Follows Central Pollution Control Board (CPCB) official piecewise linear interpolation.
 *
 * Breakpoints (PM2.5 in ug/m3):
 * 0 - 30    -> 0 - 50    (Good)
 * 31 - 60   -> 51 - 100  (Satisfactory)
 * 61 - 90   -> 101 - 200 (Moderate)
 * 91 - 120  -> 201 - 300 (Poor)
 * 121 - 250 -> 301 - 400 (Very Poor)
 * 250+      -> 401 - 500 (Severe)
 *
 * @param {number} pm25 - Particulate Matter 2.5 concentration in ug/m3
 * @returns {number} Integer AQI value between 0 and 500
 */
export function calculateIndianAQI(pm25) {
  if (pm25 === undefined || pm25 === null || isNaN(pm25) || pm25 < 0) {
    return 0;
  }
  const val = Number(pm25);
  if (val <= 30) {
    return Math.round((val * 50) / 30);
  }
  if (val <= 60) {
    return Math.round(50 + ((val - 30) * 50) / 30);
  }
  if (val <= 90) {
    return Math.round(100 + ((val - 60) * 100) / 30);
  }
  if (val <= 120) {
    return Math.round(200 + ((val - 90) * 100) / 30);
  }
  if (val <= 250) {
    return Math.round(300 + ((val - 120) * 100) / 130);
  }
  return Math.min(500, Math.round(400 + ((val - 250) * 100) / 100));
}

/**
 * Get CPCB AQI Category details
 * @param {number} aqi
 * @returns {{ category: string, color: string, healthImpact: string, advisory: string }}
 */
export function getAQICategory(aqi) {
  const val = Math.max(0, Math.min(500, Math.round(Number(aqi) || 0)));

  if (val <= 50) {
    return {
      category: 'Good',
      color: '#10b981',
      badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      healthImpact: 'Minimal health impact.',
      advisory:
        'Air quality is satisfactory. Ideal for all outdoor activities and natural ventilation.',
      grapStage: 'Normal',
    };
  }
  if (val <= 100) {
    return {
      category: 'Satisfactory',
      color: '#84cc16',
      badgeClass: 'bg-lime-50 text-lime-700 border-lime-200',
      healthImpact: 'Minor breathing discomfort to sensitive individuals.',
      advisory: 'Sensitive individuals should reduce prolonged outdoor heavy exertion.',
      grapStage: 'Normal',
    };
  }
  if (val <= 200) {
    return {
      category: 'Moderate',
      color: '#f59e0b',
      badgeClass: 'bg-amber-50 text-amber-700 border-amber-200',
      healthImpact: 'Breathing discomfort to people with asthma, heart, or lung diseases.',
      advisory:
        'Children and elderly should take frequent breaks during outdoor exertion. Close windows during peak traffic.',
      grapStage: 'GRAP Stage I (Poor - Approaching)',
    };
  }
  if (val <= 300) {
    return {
      category: 'Poor',
      color: '#f97316',
      badgeClass: 'bg-orange-50 text-orange-700 border-orange-200',
      healthImpact: 'Breathing discomfort to most people on prolonged exposure.',
      advisory:
        'Wear an N95 respirator when commuting. Avoid morning and evening rush-hour outdoor workouts.',
      grapStage: 'GRAP Stage I (Active Enforcement)',
    };
  }
  if (val <= 400) {
    return {
      category: 'Very Poor',
      color: '#ef4444',
      badgeClass: 'bg-rose-50 text-rose-700 border-rose-200',
      healthImpact: 'Respiratory illness on prolonged exposure; severe impact on sensitive groups.',
      advisory:
        'Strictly avoid intense outdoor cardio. Run indoor HEPA air purifiers and seal gaps. Emergency municipal misting deployed.',
      grapStage: 'GRAP Stage II & III (Critical)',
    };
  }
  return {
    category: 'Severe',
    color: '#7c3aed',
    badgeClass: 'bg-purple-50 text-purple-700 border-purple-200',
    healthImpact: 'Affects healthy people and severely impacts those with pre-existing conditions.',
    advisory:
      'Health warning: stay indoors with air purification. Essential travel only with certified N95/N99 protection. Emergency industrial shutdowns enforced.',
    grapStage: 'GRAP Stage IV (Emergency Protocol)',
  };
}

/**
 * Normalize telemetry records from diverse providers (WAQI, IQAir, OpenAQ, CPCB)
 * @param {object} raw
 * @param {'openaq'|'iqair'|'waqi'|'cpcb'} provider
 * @returns {object} Normalized station telemetry
 */
export function normalizeTelemetry(raw, provider = 'cpcb') {
  if (!raw) return null;

  let aqi = 0;
  let pm25 = 0;
  let pm10 = 0;
  let name = 'Monitored Station';
  let locality = 'Urban Station';
  let lat = 28.6139;
  let lng = 77.209;

  if (provider === 'openaq') {
    name = raw.name || raw.locality || 'OpenAQ Station';
    locality = raw.locality || 'India';
    lat = raw.coordinates?.lat || raw.coordinates?.latitude || lat;
    lng = raw.coordinates?.lng || raw.coordinates?.longitude || lng;
    const pm25Pol = raw.pollutants?.find((p) => p.name?.toUpperCase() === 'PM2.5');
    pm25 = pm25Pol ? Number(pm25Pol.value) : 0;
    aqi = raw.aqi || calculateIndianAQI(pm25);
  } else if (provider === 'iqair') {
    name = `${raw.city || 'City'}, ${raw.state || 'India'}`;
    locality = raw.city || 'India';
    aqi = Number(raw.aqi || raw.current?.pollution?.aqius || 0);
    pm25 = Number(raw.current?.pollution?.pm25 || 0);
    lat = raw.location?.coordinates?.[1] || lat;
    lng = raw.location?.coordinates?.[0] || lng;
  } else if (provider === 'waqi') {
    name = raw.fullName || raw.name || 'WAQI Station';
    locality = raw.name || 'India';
    aqi = Number(raw.aqi || 0);
    lat = raw.coordinates?.lat || lat;
    lng = raw.coordinates?.lng || lng;
  } else {
    name = raw.name || 'CPCB Telemetry';
    locality = raw.locality || raw.city || 'India';
    aqi = Number(raw.aqi || calculateIndianAQI(raw.pm25));
    pm25 = Number(raw.pm25 || 0);
    pm10 = Number(raw.pm10 || 0);
    lat = raw.coordinates?.lat || lat;
    lng = raw.coordinates?.lng || lng;
  }

  const category = getAQICategory(aqi);

  return {
    id: raw.id || `station-${Math.abs(Math.round(lat * 100))}-${Math.abs(Math.round(lng * 100))}`,
    name,
    locality,
    aqi,
    category: category.category,
    color: category.color,
    healthImpact: category.healthImpact,
    advisory: category.advisory,
    grapStage: category.grapStage,
    pollutants: {
      pm25,
      pm10,
    },
    coordinates: { lat, lng },
    source: provider,
    timestamp: new Date().toISOString(),
  };
}
