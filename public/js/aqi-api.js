// ============================================
// IndianAQI — WAQI API Integration
// ============================================

export async function fetchLiveStations(lat, lng, radiusDegrees = 2.5) {
  const token = window.__AEROSTREET_CONFIG__?.waqiApiToken;
  
  if (!token || token === 'your_waqi_api_token') {
    console.warn('[WAQI] No valid WAQI API token configured. Falling back to mock data.');
    return null; // Return null to signal fallback to mock data
  }

  try {
    // Calculate a rough bounding box around the state center
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

    // Filter out stations with invalid AQI (like "-")
    return (json.data || [])
      .filter(station => station.aqi && !isNaN(parseInt(station.aqi, 10)))
      .map(station => ({
        id: `waqi-${station.uid}`,
        name: station.station.name.split(',')[0], // Use the first part of the name for brevity
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
