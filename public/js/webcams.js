// ============================================
// IndianAQI — Windy Webcams API Integration
// ============================================

export async function fetchLiveWebcams() {
  const apiKey = window.__AEROSTREET_CONFIG__?.windyApiKey;
  
  if (!apiKey || apiKey === 'your_windy_api_key_here') {
    console.warn('[Webcams] No valid Windy API key configured. Skipping CCTV fetch.');
    return [];
  }

  try {
    // Fetch all webcams in India (IN)
    const url = 'https://api.windy.com/webcams/api/v3/webcams?limit=50&include=images,location&countries=IN';
    
    const response = await fetch(url, {
      headers: {
        'x-windy-api-key': apiKey,
        'Accept': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`Windy API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    return data.webcams || [];
  } catch (error) {
    console.error('[Webcams] Failed to fetch live feeds:', error);
    return [];
  }
}
