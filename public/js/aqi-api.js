// ============================================
// IndianAQI — WAQI & IQAir AirVisual API Integration
// ============================================

const IQAIR_FALLBACK_KEY = 'dc690c3c-9182-4108-8adb-bb3b2c1dde83';
const localCache = new Map();

export async function fetchLiveStations(lat, lng, radiusDegrees = 2.5) {
  const token = window.__AEROSTREET_CONFIG__?.waqiApiToken;
  
  if (!token || token === 'your_waqi_api_token') {
    console.warn('[WAQI] No valid WAQI API token configured. Falling back to mock data.');
    return null;
  }

  try {
    const lat1 = lat - radiusDegrees;
    const lng1 = lng - radiusDegrees;
    const lat2 = lat + radiusDegrees;
    const lng2 = lng + radiusDegrees;

    const url = `https://api.waqi.info/map/bounds/?latlng=${lat1},${lng1},${lat2},${lng2}&token=${token}`;
    
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`WAQI API error: ${response.status} ${response.statusText}`);
    }

    const json = await response.json();
    if (json.status !== 'ok') {
      throw new Error(`WAQI API returned error: ${json.data}`);
    }

    return (json.data || [])
      .filter(station => station.aqi && !isNaN(parseInt(station.aqi, 10)))
      .map(station => ({
        id: `waqi-${station.uid}`,
        name: station.station.name.split(',')[0],
        fullName: station.station.name,
        aqi: parseInt(station.aqi, 10),
        coordinates: { lat: station.lat, lng: station.lon },
        source: 'Live Station'
      }));
  } catch (error) {
    console.error('[WAQI] Failed to fetch live AQI data:', error);
    return null;
  }
}

export async function fetchNearestAQI(lat, lng) {
  const token = window.__AEROSTREET_CONFIG__?.waqiApiToken;
  if (!token || token === 'your_waqi_api_token') return null;

  try {
    const url = `https://api.waqi.info/feed/geo:${lat};${lng}/?token=${token}`;
    const response = await fetch(url);
    const json = await response.json();
    
    if (json.status !== 'ok') return null;
    
    return {
      aqi: json.data.aqi === '-' ? 'N/A' : parseInt(json.data.aqi, 10),
      stationName: json.data.city.name,
      dominentpol: json.data.dominentpol,
      iaqi: json.data.iaqi
    };
  } catch (error) {
    console.error('[WAQI] Failed to fetch nearest AQI:', error);
    return null;
  }
}

// ============================================
// IQAir AirVisual API Client with Dual-Transport
// ============================================

export async function fetchIQAirNearest(lat, lng) {
  const cacheKey = `iqair_${parseFloat(lat).toFixed(2)}_${parseFloat(lng).toFixed(2)}`;
  const cached = localCache.get(cacheKey);
  if (cached && (Date.now() - cached.time < 15 * 60 * 1000)) {
    return cached.data;
  }

  // 1. Try Backend Proxy first
  try {
    const response = await fetch(`/api/iqair/nearest?lat=${lat}&lon=${lng}`);
    if (response.ok) {
      const json = await response.json();
      if (json.status === 'success' && json.data) {
        const pol = json.data.current?.pollution;
        const weather = json.data.current?.weather;
        const result = {
          city: json.data.city,
          state: json.data.state,
          country: json.data.country,
          aqi: pol?.aqius ?? 0,
          mainPollutant: pol?.mainus ?? 'PM2.5',
          temperature: weather?.tp,
          humidity: weather?.hu,
          windSpeed: weather?.ws,
          source: 'IQAir AirVisual Live',
          timestamp: pol?.ts
        };
        localCache.set(cacheKey, { time: Date.now(), data: result });
        return result;
      }
    }
  } catch (e) {
    // Proxy unavailable, fallback to direct API
  }

  // 2. Direct IQAir API fallback
  const apiKey = window.__AEROSTREET_CONFIG__?.iqairApiKey || IQAIR_FALLBACK_KEY;
  try {
    const directUrl = `https://api.airvisual.com/v2/nearest_city?lat=${lat}&lon=${lng}&key=${apiKey}`;
    const response = await fetch(directUrl);
    if (!response.ok) return null;
    const json = await response.json();
    if (json.status === 'success' && json.data) {
      const pol = json.data.current?.pollution;
      const weather = json.data.current?.weather;
      const result = {
        city: json.data.city,
        state: json.data.state,
        country: json.data.country,
        aqi: pol?.aqius ?? 0,
        mainPollutant: pol?.mainus ?? 'PM2.5',
        temperature: weather?.tp,
        humidity: weather?.hu,
        windSpeed: weather?.ws,
        source: 'IQAir AirVisual Live',
        timestamp: pol?.ts
      };
      localCache.set(cacheKey, { time: Date.now(), data: result });
      return result;
    }
  } catch (err) {
    console.warn('[IQAir Direct Client Error]', err.message);
  }

  return null;
}

export async function fetchIQAirForState(stateObj) {
  if (!stateObj || !stateObj.coordinates) return null;
  return await fetchIQAirNearest(stateObj.coordinates.lat, stateObj.coordinates.lng);
}
