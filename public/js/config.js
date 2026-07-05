// ============================================
// IndianAQI — Central Configuration
// ============================================
// All API keys and feature flags in one place.
// In production, these are injected server-side.
// For the MVP, we read from window.__CONFIG__ or fall back to demo mode.

/** @type {boolean} */
export const IS_DEMO_MODE = !(window.__AEROSTREET_CONFIG__?.firebaseApiKey);

/** Firebase configuration object */
export const FIREBASE_CONFIG = {
  apiKey:            window.__AEROSTREET_CONFIG__?.firebaseApiKey            || 'demo-key',
  authDomain:        window.__AEROSTREET_CONFIG__?.firebaseAuthDomain        || 'demo.firebaseapp.com',
  projectId:         window.__AEROSTREET_CONFIG__?.firebaseProjectId         || 'demo-project',
  storageBucket:     window.__AEROSTREET_CONFIG__?.firebaseStorageBucket     || 'demo.appspot.com',
  messagingSenderId: window.__AEROSTREET_CONFIG__?.firebaseMessagingSenderId || '000000000000',
  appId:             window.__AEROSTREET_CONFIG__?.firebaseAppId             || 'demo-app-id',
};

/** Google Maps API Key */
export const GOOGLE_MAPS_API_KEY = window.__AEROSTREET_CONFIG__?.googleMapsApiKey || '';

/** Server API base URL */
export const API_BASE_URL = window.__AEROSTREET_CONFIG__?.apiBaseUrl || '';

/** Default map center (India) */
export const MAP_CENTER = { lat: 22.5937, lng: 78.9629 };
export const MAP_ZOOM = 5;

/** AQI severity thresholds and colors (Corporate Professional style) */
export const AQI_LEVELS = {
  GOOD:         { min: 0,   max: 50,  label: 'Good',           color: '#16a34a', bgClass: 'bg-green-600' },
  SATISFACTORY: { min: 51,  max: 100, label: 'Satisfactory',   color: '#22c55e', bgClass: 'bg-green-500' },
  MODERATE:     { min: 101, max: 200, label: 'Moderate',       color: '#d97706', bgClass: 'bg-amber-600' },
  POOR:         { min: 201, max: 300, label: 'Poor',            color: '#dc2626', bgClass: 'bg-red-600' },
  VERY_POOR:    { min: 301, max: 400, label: 'Very Poor',       color: '#991b1b', bgClass: 'bg-red-800' },
  SEVERE:       { min: 401, max: 500, label: 'Severe',          color: '#7f1d1d', bgClass: 'bg-red-950' },
};

/** Report categories */
export const REPORT_CATEGORIES = [
  { id: 'smoke',       label: 'Heavy Smoke / Emissions',  icon: 'smoking_rooms' },
  { id: 'litter',      label: 'Litter / Illegal Dumping',  icon: 'delete' },
  { id: 'dust',        label: 'Construction Dust',         icon: 'construction' },
  { id: 'burning',     label: 'Open Burning',              icon: 'local_fire_department' },
  { id: 'industrial',  label: 'Industrial Pollution',      icon: 'factory' },
  { id: 'traffic',     label: 'Traffic Congestion',        icon: 'traffic' },
  { id: 'other',       label: 'Other',                     icon: 'report' },
];

/**
 * Get AQI level info for a given AQI value
 * @param {number} aqi
 * @returns {{ label: string, color: string, bgClass: string }}
 */
export function getAQILevel(aqi) {
  for (const level of Object.values(AQI_LEVELS)) {
    if (aqi >= level.min && aqi <= level.max) return level;
  }
  return AQI_LEVELS.SEVERE;
}

console.log(`[IndianAQI] Running in ${IS_DEMO_MODE ? 'DEMO' : 'LIVE'} mode`);
