// ============================================
// IndianAQI — Predictive 3D Heatmap Module
// ============================================
// Loads Google Maps and Deck.gl from CDN dynamically.
// Renders tomorrow's predicted AQI hotspots based on Gemini AI.

let googleMapsLoadingPromise = null;
let deckGLLoadingPromise = null;
let mapInstance = null;
let overlayInstance = null;

// Dynamic Script Loader with caching
function loadScript(url, globalName) {
  return new Promise((resolve, reject) => {
    if (window[globalName]) {
      resolve();
      return;
    }
    
    // Check if script element already exists
    const existing = document.querySelector(`script[src="${url}"]`);
    if (existing) {
      existing.addEventListener('load', resolve);
      existing.addEventListener('error', reject);
      return;
    }

    const script = document.createElement('script');
    script.src = url;
    script.async = true;
    script.onload = resolve;
    script.onerror = () => {
      console.error(`Failed to load script: ${url}`);
      reject(new Error(`Failed to load ${url}`));
    };
    document.head.appendChild(script);
  });
}

/**
 * Load Google Maps JavaScript API
 */
function loadGoogleMapsScript(apiKey) {
  if (googleMapsLoadingPromise) return googleMapsLoadingPromise;

  const url = apiKey 
    ? `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=visualization`
    : `https://maps.googleapis.com/maps/api/js?libraries=visualization`;

  googleMapsLoadingPromise = loadScript(url, 'google')
    .then(() => {
      if (!window.google || !window.google.maps) {
        throw new Error('Google Maps namespace not loaded');
      }
      return window.google;
    });

  return googleMapsLoadingPromise;
}

/**
 * Load Deck.gl standalone CDN bundle
 */
function loadDeckGLScript() {
  if (deckGLLoadingPromise) return deckGLLoadingPromise;

  const url = 'https://unpkg.com/deck.gl@8.9.0/dist.min.js';
  
  deckGLLoadingPromise = loadScript(url, 'deck')
    .then(() => {
      if (!window.deck) {
        throw new Error('Deck.gl namespace not loaded');
      }
      return window.deck;
    });

  return deckGLLoadingPromise;
}

// Sleek dark-blue styling theme for Google Maps
const darkMapStyle = [
  { "elementType": "geometry", "stylers": [{ "color": "#0f172a" }] },
  { "elementType": "labels.text.fill", "stylers": [{ "color": "#94a3b8" }] },
  { "elementType": "labels.text.stroke", "stylers": [{ "color": "#0f172a" }] },
  { "featureType": "administrative.country", "elementType": "geometry.stroke", "stylers": [{ "color": "#334155" }] },
  { "featureType": "administrative.province", "elementType": "geometry.stroke", "stylers": [{ "color": "#334155" }] },
  { "featureType": "landscape.natural", "elementType": "geometry", "stylers": [{ "color": "#1e293b" }] },
  { "featureType": "poi", "elementType": "geometry", "stylers": [{ "color": "#1e293b" }] },
  { "featureType": "poi", "elementType": "labels.text.fill", "stylers": [{ "color": "#64748b" }] },
  { "featureType": "road", "elementType": "geometry", "stylers": [{ "color": "#334155" }] },
  { "featureType": "road", "elementType": "labels.text.fill", "stylers": [{ "color": "#94a3b8" }] },
  { "featureType": "road.highway", "elementType": "geometry", "stylers": [{ "color": "#475569" }] },
  { "featureType": "transit", "elementType": "geometry", "stylers": [{ "color": "#1e293b" }] },
  { "featureType": "water", "elementType": "geometry", "stylers": [{ "color": "#020617" }] }
];

/**
 * Initialize and render the predictive AI Heatmap
 * @param {string} containerId - Element ID to render map in
 */
export async function initPredictiveHeatmap(containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;

  // Add a modern sleek loading spinner
  container.innerHTML = `
    <div id="predictive-loading" class="absolute inset-0 flex flex-col items-center justify-center bg-slate-900/90 z-30 transition-opacity duration-300">
      <div class="w-12 h-12 rounded-full border-4 border-primary border-t-transparent animate-spin mb-4"></div>
      <p class="text-sm font-semibold text-white">Consulting Gemini environmental forecast...</p>
      <p class="text-[11px] text-slate-400 mt-1">Generating 24hr predicted Delhi AQI coordinates</p>
    </div>
    <div id="predictive-map-canvas" class="w-full h-full"></div>
  `;

  const config = window.__AEROSTREET_CONFIG__ || {};
  const mapsApiKey = config.googleMapsApiKey;
  const isFallbackKey = !mapsApiKey;

  try {
    // 1. Fetch AI predictions from backend API
    const response = await fetch('/api/predictive-heatmap');
    if (!response.ok) throw new Error('Failed to fetch AI AQI prediction coordinates');
    const predictedAqiData = await response.json();

    console.log('[Heatmap] AI Predicted Data loaded:', predictedAqiData);

    // 2. Load Google Maps and Deck.gl scripts
    await Promise.all([
      loadGoogleMapsScript(mapsApiKey),
      loadDeckGLScript()
    ]);

    const loadingSpinner = document.getElementById('predictive-loading');
    if (loadingSpinner) {
      loadingSpinner.style.opacity = '0';
      setTimeout(() => loadingSpinner.remove(), 300);
    }

    // 3. Render Google Map in canvas
    const canvas = document.getElementById('predictive-map-canvas');
    const mapCenter = { lat: 28.6139, lng: 77.2090 }; // Center on Delhi

    mapInstance = new google.maps.Map(canvas, {
      center: mapCenter,
      zoom: 11,
      styles: darkMapStyle,
      mapTypeControl: false,
      streetViewControl: false,
      fullscreenControl: false,
      zoomControl: true,
      zoomControlOptions: {
        position: google.maps.ControlPosition.RIGHT_BOTTOM
      }
    });

    // 4. Setup Deck.gl HeatmapLayer
    const aqiHeatmapLayer = new deck.HeatmapLayer({
      id: 'predictive-aqi-layer',
      data: predictedAqiData,
      getPosition: d => d.coordinates,
      getWeight: d => d.aqiPrediction,
      radiusPixels: 60,
      intensity: 2.0,
      colorRange: [
        [34, 197, 94],   // Green (Good) - 22c55e
        [234, 179, 8],   // Yellow (Moderate) - eab308
        [239, 68, 68],   // Red (Poor/Severe) - ef4444
        [147, 51, 234]   // Purple (Hazardous) - 9333ea
      ]
    });

    // 5. Overlay Deck.gl layer on the Google Map
    overlayInstance = new deck.GoogleMapsOverlay({
      layers: [aqiHeatmapLayer]
    });

    overlayInstance.setMap(mapInstance);

    // 6. If Google Maps API key is missing, show a tiny floating sandbox toast inside map
    if (isFallbackKey) {
      const warningBanner = document.createElement('div');
      warningBanner.className = 'absolute top-16 left-4 right-4 z-20 pointer-events-none flex justify-center';
      warningBanner.innerHTML = `
        <div class="pointer-events-auto bg-amber-500/90 backdrop-blur-sm text-slate-900 text-[11px] font-bold px-4 py-2 rounded-lg shadow-lg flex items-center gap-1.5 border border-amber-600/35">
          <span class="material-symbols-outlined text-[16px]">info</span>
          Demo mode: Add a GOOGLE_MAPS_API_KEY in your .env file for a fully licensed production map.
        </div>
      `;
      container.appendChild(warningBanner);
    }

  } catch (err) {
    console.error('[Heatmap] Initialization failed:', err);
    container.innerHTML = `
      <div class="absolute inset-0 flex flex-col items-center justify-center bg-slate-950 p-6 text-center text-slate-300">
        <span class="material-symbols-outlined text-[48px] text-red-500 mb-4 animate-bounce">error</span>
        <h4 class="font-bold text-sm text-white">Heatmap Rendering Failed</h4>
        <p class="text-xs text-slate-400 max-w-sm mt-1">${err.message || 'Check browser console or terminal logs'}</p>
        <button id="heatmap-retry-btn" class="mt-4 px-4 py-2 bg-primary text-white text-xs font-semibold rounded-btn hover:bg-primary-hover transition-colors">
          Retry Rendering
        </button>
      </div>
    `;
    
    document.getElementById('heatmap-retry-btn')?.addEventListener('click', () => {
      initPredictiveHeatmap(containerId);
    });
  }
}
