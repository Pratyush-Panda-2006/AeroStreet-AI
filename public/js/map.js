// ============================================
// IndianAQI — Interactive SVG Map Integration
// ============================================
// Renders a high-performance interactive SVG map of India.
// Supports drilling down into states (West Bengal, Karnataka, Maharashtra)
// to view district-level boundaries and AQIs in real-time.

import { AQI_LEVELS, getAQILevel, IS_DEMO_MODE } from './config.js';
import { STATE_PATHS, STATE_DISTRICTS_MAP } from './india-map-svg.js';
import { DEMO_STATES, DEMO_DISTRICTS_BY_STATE, DEMO_HOTSPOTS } from './demo-data.js';
import { getDb, COLLECTIONS, isFirebaseAvailable } from './firebase-init.js';
import { fetchLiveStations } from './aqi-api.js';

// Bounding box coordinate mappings from lat/lng to custom local SVG coordinates
const STATE_MAP_BOUNDS = {
  'in-wb': { latMin: 21.5, latMax: 27.2, lngMin: 85.8, lngMax: 89.8, xMin: 20, xMax: 280, yMin: 480, yMax: 20 },
  'in-ka': { latMin: 11.5, latMax: 18.5, lngMin: 74.0, lngMax: 78.5, xMin: 20, xMax: 280, yMin: 430, yMax: 20 },
  'in-mh': { latMin: 15.5, latMax: 22.2, lngMin: 72.5, lngMax: 81.0, xMin: 20, xMax: 430, yMin: 330, yMax: 20 },
  'in-up': { latMin: 23.8, latMax: 30.5, lngMin: 77.0, lngMax: 84.5, xMin: 20, xMax: 430, yMin: 380, yMax: 20 },
  'in-br': { latMin: 24.3, latMax: 27.5, lngMin: 83.2, lngMax: 88.3, xMin: 20, xMax: 430, yMin: 320, yMax: 20 },
  'in-gj': { latMin: 20.0, latMax: 24.8, lngMin: 68.0, lngMax: 74.5, xMin: 20, xMax: 430, yMin: 320, yMax: 20 },
  'in-rj': { latMin: 23.0, latMax: 30.2, lngMin: 69.5, lngMax: 78.3, xMin: 20, xMax: 430, yMin: 350, yMax: 20 },
  'in-tn': { latMin: 8.0, latMax: 13.8, lngMin: 76.0, lngMax: 80.5, xMin: 20, xMax: 300, yMin: 420, yMax: 20 }
};

const STATE_CENTERS = {
  'in-wb': { lat: 22.5726, lng: 88.3639 },
  'in-ka': { lat: 12.9716, lng: 77.5946 },
  'in-mh': { lat: 19.0760, lng: 72.8777 },
  'in-up': { lat: 26.8467, lng: 80.9462 },
  'in-br': { lat: 25.5941, lng: 85.1376 },
  'in-gj': { lat: 22.2587, lng: 71.1924 },
  'in-rj': { lat: 27.0238, lng: 74.2179 },
  'in-tn': { lat: 11.1271, lng: 78.6569 }
};

function mapLatLngToSVG(lat, lng, bounds) {
  const x = bounds.xMin + ((lng - bounds.lngMin) / (bounds.lngMax - bounds.lngMin)) * (bounds.xMax - bounds.xMin);
  const y = bounds.yMin - ((lat - bounds.latMin) / (bounds.latMax - bounds.latMin)) * (bounds.yMin - bounds.yMax);
  return { x, y };
}

let mapContainerId = 'map-container';
let currentZoomedState = null; // null (National) or stateId (e.g., 'in-wb')
let liveHotspots = [];
let liveReports = [];
let showWeatherVectors = false;

export function setWeatherVectors(active) {
  showWeatherVectors = active;
  if (currentZoomedState) {
    zoomToState(currentZoomedState);
  } else {
    renderNationalMap();
  }
}

// Callbacks for UI updates
let onStateChangeCallback = null;

export function registerOnStateChange(cb) {
  onStateChangeCallback = cb;
}

/**
 * Initialize the interactive SVG map in a container
 * @param {string} containerId - ID of the map container element
 * @returns {Promise<boolean>}
 */
export async function initMap(containerId) {
  mapContainerId = containerId;
  const container = document.getElementById(containerId);
  if (!container) {
    console.warn(`[Map] Container #${containerId} not found`);
    return false;
  }

  console.log('[Map] Initializing custom interactive SVG map');

  // Update WAQI status badge in sidebar legend
  const token = window.__AEROSTREET_CONFIG__?.waqiApiToken;
  const badge = document.getElementById('waqi-status-badge');
  if (badge) {
    if (token && token !== 'your_waqi_api_token') {
      badge.textContent = 'ACTIVE';
      badge.className = 'px-2 py-0.5 rounded-full font-bold bg-green-50 text-success border border-green-100';
    } else {
      badge.textContent = 'DEMO';
      badge.className = 'px-2 py-0.5 rounded-full font-bold bg-slate-100 text-slate-400 border border-slate-200';
    }
  }

  // Clear container
  container.innerHTML = '';
  container.className = `${container.className} relative flex flex-col items-center justify-center p-4`;

  // Render national map immediately so it shows up instantly without waiting for network!
  renderNationalMap();

  // Load live data in the background asynchronously
  loadMapData().then(() => {
    console.log('[Map] Asynchronous database load completed');
    if (currentZoomedState) {
      zoomToState(currentZoomedState);
    } else {
      renderNationalMap();
    }
  }).catch((err) => {
    console.warn('[Map] Asynchronous database load failed, kept demo data:', err.message);
  });

  return true;
}

/**
 * Fetch map data (sensor hotspots & citizen reports) with timeout
 */
async function loadMapData() {
  if (isFirebaseAvailable()) {
    try {
      const db = await getDb();
      const { collection, getDocs } = await import('https://www.gstatic.com/firebasejs/11.6.0/firebase-firestore.js');
      
      // Simple timeout helper
      const timeout = new Promise((_, reject) => setTimeout(() => reject(new Error('Firestore Timeout')), 2500));
      
      const hotspotSnapshot = await Promise.race([
        getDocs(collection(db, COLLECTIONS.HOTSPOTS)),
        timeout
      ]);
      liveHotspots = hotspotSnapshot.empty 
        ? DEMO_HOTSPOTS 
        : hotspotSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

      const reportSnapshot = await Promise.race([
        getDocs(collection(db, COLLECTIONS.REPORTS)),
        timeout
      ]);
      liveReports = reportSnapshot.empty 
        ? [] 
        : reportSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (e) {
      console.warn('[Map] Firebase fetch timed out or failed, using fallback demo data', e.message);
      liveHotspots = DEMO_HOTSPOTS;
      liveReports = [];
    }
  } else {
    liveHotspots = DEMO_HOTSPOTS;
    liveReports = [];
  }
}

/**
 * Render Pan-India State-Level Map
 */
export function renderNationalMap() {
  currentZoomedState = null;
  const container = document.getElementById(mapContainerId);
  if (!container) return;

  // Create SVG wrapper
  const svgNS = "http://www.w3.org/2000/svg";
  const svg = document.createElementNS(svgNS, "svg");
  svg.setAttribute("viewBox", "0 0 600 650");
  svg.setAttribute("class", "w-full h-full max-h-[500px] select-none transition-all duration-500 animate-[fadeIn_0.5s_ease-out]");
  svg.style.filter = "drop-shadow(0 10px 15px rgba(2, 6, 23, 0.08))";

  // Render Grid lines pattern in background for enterprise look
  const defs = document.createElementNS(svgNS, "defs");
  defs.innerHTML = `
    <pattern id="mapGrid" width="40" height="40" patternUnits="userSpaceOnUse">
      <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#f1f5f9" stroke-width="1"/>
    </pattern>
  `;
  svg.appendChild(defs);

  const gridRect = document.createElementNS(svgNS, "rect");
  gridRect.setAttribute("width", "100%");
  gridRect.setAttribute("height", "100%");
  gridRect.setAttribute("fill", "url(#mapGrid)");
  svg.appendChild(gridRect);

  // Render state paths
  STATE_PATHS.forEach(state => {
    // Find state data
    const stateData = DEMO_STATES.find(s => s.id === state.id) || { aqi: 50 };
    const level = getAQILevel(stateData.aqi);

    const path = document.createElementNS(svgNS, "path");
    path.setAttribute("d", state.path);
    path.setAttribute("class", "interactive-map-area transition-all duration-300 ease-in-out");
    path.setAttribute("stroke", "#cbd5e1");
    path.setAttribute("stroke-width", "1.5");
    path.setAttribute("fill", `${level.color}45`); // Soft tint
    path.style.cursor = "pointer";

    // Set custom hover interactions
    path.addEventListener('mouseenter', (e) => {
      path.setAttribute("fill", `${level.color}80`);
      path.setAttribute("stroke", "#2563eb");
      path.setAttribute("stroke-width", "2");
      showMapTooltip(e, `
        <div class="font-bold text-slate-900">${state.name}</div>
        <div class="text-xs text-slate-500 mt-0.5">Capital: ${stateData.capital || 'N/A'}</div>
        <div class="flex items-center gap-2 mt-2 pt-1 border-t border-slate-100">
          <span class="w-2.5 h-2.5 rounded-full" style="background: ${level.color}"></span>
          <span class="font-semibold text-slate-700">AQI ${stateData.aqi}</span>
          <span class="text-[10px] uppercase font-bold text-slate-400 font-mono">(${level.label})</span>
        </div>
        ${STATE_DISTRICTS_MAP[state.id] ? `<div class="text-[10px] text-blue-600 font-semibold mt-1">🖱 Click to check district AQIs</div>` : ''}
      `);
    });

    path.addEventListener('mouseleave', () => {
      path.setAttribute("fill", `${level.color}45`);
      path.setAttribute("stroke", "#cbd5e1");
      path.setAttribute("stroke-width", "1.5");
      hideMapTooltip();
    });

    path.addEventListener('mousemove', (e) => {
      positionTooltip(e);
    });

    path.addEventListener('click', () => {
      zoomToState(state.id);
    });

    svg.appendChild(path);
  });

  // Render floating overlay indicators for major cities on the SVG map
  renderNationalCityPins(svg, svgNS);

  if (showWeatherVectors) {
    drawWindArrows(svg, svgNS);
  }

  container.innerHTML = '';
  container.appendChild(svg);

  // Fire state change callback
  if (onStateChangeCallback) {
    onStateChangeCallback({ view: 'national', data: DEMO_STATES });
  }
}

/**
 * Render major city overlay markers on national map
 */
function renderNationalCityPins(svg, svgNS) {
  const cities = [
    { name: 'Delhi', cx: 235, cy: 165, aqi: 345 },
    { name: 'Mumbai', cx: 145, cy: 330, aqi: 142 },
    { name: 'Bengaluru', cx: 210, cy: 470, aqi: 55 },
    { name: 'Kolkata', cx: 435, cy: 320, aqi: 178 }
  ];

  cities.forEach(city => {
    const level = getAQILevel(city.aqi);

    // Outer glowing ring
    const glow = document.createElementNS(svgNS, "circle");
    glow.setAttribute("cx", city.cx);
    glow.setAttribute("cy", city.cy);
    glow.setAttribute("r", "8");
    glow.setAttribute("fill", level.color);
    glow.setAttribute("opacity", "0.3");
    glow.innerHTML = `<animate attributeName="r" values="6;12;6" dur="3s" repeatCount="indefinite" />`;

    // Inner solid core
    const core = document.createElementNS(svgNS, "circle");
    core.setAttribute("cx", city.cx);
    core.setAttribute("cy", city.cy);
    core.setAttribute("r", "4");
    core.setAttribute("fill", level.color);
    core.setAttribute("stroke", "#ffffff");
    core.setAttribute("stroke-width", "1");

    svg.appendChild(glow);
    svg.appendChild(core);
  });
}

/**
 * Drill-down zoom transition into a particular state
 */
function getOrCreateStateConfig(stateId) {
  if (STATE_DISTRICTS_MAP[stateId]) {
    return STATE_DISTRICTS_MAP[stateId];
  }
  
  const statePathObj = STATE_PATHS.find(s => s.id === stateId);
  if (!statePathObj) return null;
  
  const stateData = DEMO_STATES.find(s => s.id === stateId) || { name: statePathObj.name, aqi: 100, capital: 'Capital' };
  
  // Dynamic mock districts for non-explicitly mapped states
  let dists = [];
  const cap = stateData.capital || 'Capital';
  
  if (stateId === 'in-dl') {
    dists = [
      { id: 'delhi-c', name: 'New Delhi Central', aqi: 342, center: { x: 280, y: 300 } },
      { id: 'delhi-e', name: 'East Delhi', aqi: 365, center: { x: 330, y: 280 } },
      { id: 'delhi-s', name: 'South Delhi', aqi: 290, center: { x: 300, y: 340 } },
      { id: 'delhi-n', name: 'North Delhi', aqi: 310, center: { x: 260, y: 240 } }
    ];
  } else if (stateId === 'in-up') {
    dists = [
      { id: 'up-lko', name: 'Lucknow', aqi: 280, center: { x: 220, y: 280 } },
      { id: 'up-knp', name: 'Kanpur', aqi: 295, center: { x: 200, y: 310 } },
      { id: 'up-noid', name: 'Noida', aqi: 320, center: { x: 100, y: 150 } },
      { id: 'up-vns', name: 'Varanasi', aqi: 240, center: { x: 340, y: 330 } }
    ];
  } else if (stateId === 'in-br') {
    dists = [
      { id: 'br-pat', name: 'Patna', aqi: 230, center: { x: 240, y: 200 } },
      { id: 'br-gay', name: 'Gaya', aqi: 180, center: { x: 230, y: 250 } },
      { id: 'br-muz', name: 'Muzaffarpur', aqi: 210, center: { x: 260, y: 160 } }
    ];
  } else if (stateId === 'in-gj') {
    dists = [
      { id: 'gj-ahd', name: 'Ahmedabad', aqi: 120, center: { x: 180, y: 220 } },
      { id: 'gj-srt', name: 'Surat', aqi: 110, center: { x: 210, y: 340 } },
      { id: 'gj-vad', name: 'Vadodara', aqi: 95, center: { x: 220, y: 280 } }
    ];
  } else if (stateId === 'in-rj') {
    dists = [
      { id: 'rj-jpr', name: 'Jaipur', aqi: 190, center: { x: 260, y: 210 } },
      { id: 'rj-jdp', name: 'Jodhpur', aqi: 140, center: { x: 140, y: 230 } },
      { id: 'rj-udp', name: 'Udaipur', aqi: 115, center: { x: 170, y: 340 } }
    ];
  } else if (stateId === 'in-tn') {
    dists = [
      { id: 'tn-chn', name: 'Chennai', aqi: 75, center: { x: 220, y: 80 } },
      { id: 'tn-cbe', name: 'Coimbatore', aqi: 52, center: { x: 80, y: 280 } },
      { id: 'tn-mdu', name: 'Madurai', aqi: 62, center: { x: 130, y: 330 } }
    ];
  } else {
    dists = [
      { id: `${stateId}-d1`, name: `${cap} City`, aqi: Math.max(10, stateData.aqi + 12), center: { x: 240, y: 260 } },
      { id: `${stateId}-d2`, name: `${statePathObj.name} Rural`, aqi: Math.max(5, stateData.aqi - 8), center: { x: 300, y: 320 } },
      { id: `${stateId}-d3`, name: `${cap} Industrial Zone`, aqi: Math.max(15, stateData.aqi + 25), center: { x: 210, y: 310 } }
    ];
  }

  return {
    name: statePathObj.name,
    viewBox: "0 0 600 650",
    paths: dists.map(d => ({
      id: d.id,
      name: d.name,
      path: statePathObj.path, // Re-use state boundary backdrop
      center: d.center,
      aqi: d.aqi
    }))
  };
}

/**
 * Drill-down zoom transition into a particular state
 */
export function zoomToState(stateId) {
  currentZoomedState = stateId;
  const stateConfig = getOrCreateStateConfig(stateId);
  if (!stateConfig) return;

  const container = document.getElementById(mapContainerId);
  if (!container) return;

  console.log(`[Map] Drilling down into state: ${stateConfig.name}`);

  const svgNS = "http://www.w3.org/2000/svg";
  const svg = document.createElementNS(svgNS, "svg");
  svg.setAttribute("viewBox", stateConfig.viewBox);
  svg.setAttribute("class", "w-full h-full max-h-[500px] select-none transition-all duration-500 animate-[fadeIn_0.5s_ease-out]");
  svg.style.filter = "drop-shadow(0 10px 20px rgba(2, 6, 23, 0.1))";

  // Grid line pattern
  const defs = document.createElementNS(svgNS, "defs");
  defs.innerHTML = `
    <pattern id="stateGrid" width="30" height="30" patternUnits="userSpaceOnUse">
      <path d="M 30 0 L 0 0 0 30" fill="none" stroke="#f8fafc" stroke-width="1"/>
    </pattern>
  `;
  svg.appendChild(defs);

  const gridRect = document.createElementNS(svgNS, "rect");
  gridRect.setAttribute("width", "100%");
  gridRect.setAttribute("height", "100%");
  gridRect.setAttribute("fill", "url(#stateGrid)");
  svg.appendChild(gridRect);

  // Render districts
  let districts = DEMO_DISTRICTS_BY_STATE[stateId];
  if (!districts || districts.length === 0) {
    districts = stateConfig.paths.map(p => ({
      id: p.id,
      name: p.name,
      state: stateConfig.name,
      aqi: p.aqi || 45
    }));
  }

  stateConfig.paths.forEach(dist => {
    const distData = districts.find(d => d.id === dist.id) || { aqi: 45 };
    const level = getAQILevel(distData.aqi);

    const path = document.createElementNS(svgNS, "path");
    path.setAttribute("d", dist.path);
    path.setAttribute("stroke", "#e2e8f0");
    path.setAttribute("stroke-width", "1");
    path.setAttribute("fill", `${level.color}45`);
    path.style.cursor = "pointer";
    path.setAttribute("class", "transition-all duration-200");

    path.addEventListener('mouseenter', (e) => {
      path.setAttribute("fill", `${level.color}80`);
      path.setAttribute("stroke", "#2563eb");
      path.setAttribute("stroke-width", "1.5");
      showMapTooltip(e, `
        <div class="font-bold text-slate-900">${dist.name}</div>
        <div class="text-xs text-slate-400">District · ${stateConfig.name}</div>
        <div class="flex items-center gap-2 mt-2 pt-1 border-t border-slate-100">
          <span class="w-2.5 h-2.5 rounded-full" style="background: ${level.color}"></span>
          <span class="font-semibold text-slate-700">AQI ${distData.aqi}</span>
          <span class="text-[10px] uppercase font-bold text-slate-400">(${level.label})</span>
        </div>
        <div class="space-y-0.5 mt-1 text-[11px] text-slate-500">
          <div>PM2.5: ${distData.pollutants?.[0]?.value || Math.round(distData.aqi * 0.7)} µg/m³</div>
        </div>
      `);
    });

    path.addEventListener('mouseleave', () => {
      path.setAttribute("fill", `${level.color}45`);
      path.setAttribute("stroke", "#e2e8f0");
      path.setAttribute("stroke-width", "1");
      hideMapTooltip();
    });

    path.addEventListener('mousemove', (e) => {
      positionTooltip(e);
    });

    path.addEventListener('click', () => {
      window.__aerostreet?.showToast?.(`Selected district: ${dist.name} (AQI: ${distData.aqi})`, 'success');
    });

    svg.appendChild(path);

    // Place small colored circle core for district monitoring stations
    if (dist.center) {
      const core = document.createElementNS(svgNS, "circle");
      core.setAttribute("cx", dist.center.x);
      core.setAttribute("cy", dist.center.y);
      core.setAttribute("r", "3.5");
      core.setAttribute("fill", level.color);
      core.setAttribute("stroke", "#ffffff");
      core.setAttribute("stroke-width", "1");
      svg.appendChild(core);
    }
  });

  if (showWeatherVectors) {
    drawWindArrows(svg, svgNS);
  }

  // Render a clean floating Back Button inside the map container
  container.innerHTML = '';
  container.appendChild(svg);

  const backBtn = document.createElement('button');
  backBtn.className = 'absolute top-4 left-4 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-sm border border-slate-800 transition-all';
  backBtn.innerHTML = `
    <span class="material-symbols-outlined text-[16px]">arrow_back</span>
    Back to India Map
  `;
  backBtn.addEventListener('click', () => {
    renderNationalMap();
  });
  container.appendChild(backBtn);

  // Fetch and overlay live WAQI stations asynchronously if API key is active
  const stateCenter = STATE_CENTERS[stateId];
  if (stateCenter) {
    fetchLiveStations(stateCenter.lat, stateCenter.lng, 1.5).then(stations => {
      if (stations && stations.length > 0) {
        console.log(`[Map] Overlaying ${stations.length} live WAQI stations on the map`);
        const bounds = STATE_MAP_BOUNDS[stateId];
        if (bounds) {
          stations.forEach(st => {
            const pos = mapLatLngToSVG(st.coordinates.lat, st.coordinates.lng, bounds);
            // Verify inside bounds
            if (pos.x >= bounds.xMin && pos.x <= bounds.xMax && pos.y >= bounds.yMax && pos.y <= bounds.yMin) {
              const level = getAQILevel(st.aqi);

              // Pulsing outer ring
              const ring = document.createElementNS(svgNS, "circle");
              ring.setAttribute("cx", pos.x);
              ring.setAttribute("cy", pos.y);
              ring.setAttribute("r", "7");
              ring.setAttribute("fill", level.color);
              ring.setAttribute("opacity", "0.25");
              
              const anim = document.createElementNS(svgNS, "animate");
              anim.setAttribute("attributeName", "r");
              anim.setAttribute("values", "5;10;5");
              anim.setAttribute("dur", "2s");
              anim.setAttribute("repeatCount", "indefinite");
              ring.appendChild(anim);

              // Solid core
              const core = document.createElementNS(svgNS, "circle");
              core.setAttribute("cx", pos.x);
              core.setAttribute("cy", pos.y);
              core.setAttribute("r", "3");
              core.setAttribute("fill", level.color);
              core.setAttribute("stroke", "#ffffff");
              core.setAttribute("stroke-width", "0.75");
              core.style.cursor = 'pointer';

              const tooltipContent = `
                <div class="font-bold text-slate-900">${st.name}</div>
                <div class="text-[10px] text-slate-400 font-semibold">Live Station (WAQI Feed)</div>
                <div class="flex items-center gap-2 mt-2 pt-1 border-t border-slate-100">
                  <span class="w-2.5 h-2.5 rounded-full" style="background: ${level.color}"></span>
                  <span class="font-semibold text-slate-700">AQI ${st.aqi}</span>
                  <span class="text-[10px] uppercase font-bold text-slate-400">(${level.label})</span>
                </div>
              `;

              core.addEventListener('mouseenter', (e) => {
                core.setAttribute("r", "5");
                core.setAttribute("stroke-width", "1.5");
                showMapTooltip(e, tooltipContent);
              });
              
              core.addEventListener('mouseleave', () => {
                core.setAttribute("r", "3");
                core.setAttribute("stroke-width", "0.75");
                hideMapTooltip();
              });

              core.addEventListener('mousemove', positionTooltip);

              svg.appendChild(ring);
              svg.appendChild(core);
            }
          });
        }

        // Merge live stations into the sidebar list
        if (onStateChangeCallback) {
          const mergedData = [
            ...districts,
            ...stations.map(st => ({
              id: st.id,
              name: `📶 ${st.name}`,
              aqi: st.aqi,
              state: 'Live Station Feed',
              pollutants: [{ name: 'AQI', value: st.aqi, unit: '' }]
            }))
          ];
          onStateChangeCallback({ view: 'state', name: stateConfig.name, data: mergedData });
        }
      }
    }).catch(err => {
      console.warn('[Map] Failed to overlay live WAQI stations:', err.message);
    });
  }

  // Fire state change callback to sync sidebar explorer list
  if (onStateChangeCallback) {
    onStateChangeCallback({ view: 'state', name: stateConfig.name, data: districts });
  }
}

// ── Tooltip Helpers ──

function showMapTooltip(e, content) {
  let tooltip = document.getElementById('map-tooltip');
  if (!tooltip) {
    tooltip = document.createElement('div');
    tooltip.id = 'map-tooltip';
    tooltip.className = 'fixed z-[999] pointer-events-none p-3 rounded-xl border border-slate-200 bg-white/95 backdrop-blur-md shadow-xl text-slate-700 text-xs font-sans max-w-xs transition-opacity duration-150 opacity-0';
    document.body.appendChild(tooltip);
  }
  tooltip.innerHTML = content;
  tooltip.style.opacity = '1';
  positionTooltip(e);
}

function positionTooltip(e) {
  const tooltip = document.getElementById('map-tooltip');
  if (!tooltip) return;

  const width = tooltip.offsetWidth;
  const height = tooltip.offsetHeight;
  const x = e.clientX + 15;
  const y = e.clientY - height - 10;

  tooltip.style.left = `${x}px`;
  tooltip.style.top = `${y}px`;
}

function hideMapTooltip() {
  const tooltip = document.getElementById('map-tooltip');
  if (tooltip) {
    tooltip.style.opacity = '0';
  }
}

/** Stub compatibility with legacy markers API */
export function renderHotspotMarkers(hotspots) {
  loadMapData().then(() => {
    if (currentZoomedState) {
      zoomToState(currentZoomedState);
    } else {
      renderNationalMap();
    }
  });
}

export function clearMarkers() {}
export function getMap() { return null; }
export const mapInitialized = true;

/**
 * Draw animated weather wind direction vectors on the SVG map canvas
 */
function drawWindArrows(svg, svgNS) {
  const arrowGrid = [
    { x: 100, y: 150, angle: 45 },
    { x: 220, y: 180, angle: 30 },
    { x: 350, y: 220, angle: 60 },
    { x: 450, y: 130, angle: 45 },
    { x: 150, y: 300, angle: 40 },
    { x: 280, y: 320, angle: 35 },
    { x: 400, y: 360, angle: 50 },
    { x: 180, y: 450, angle: 45 },
    { x: 320, y: 480, angle: 30 }
  ];
  
  arrowGrid.forEach(arrow => {
    const g = document.createElementNS(svgNS, "g");
    g.setAttribute("transform", `translate(${arrow.x}, ${arrow.y}) rotate(${arrow.angle})`);
    
    const path = document.createElementNS(svgNS, "path");
    path.setAttribute("d", "M-10 0 L10 0 M5 -4 L10 0 L5 4");
    path.setAttribute("stroke", "#3b82f6");
    path.setAttribute("stroke-width", "2");
    path.setAttribute("fill", "none");
    path.setAttribute("stroke-linecap", "round");
    path.setAttribute("stroke-linejoin", "round");
    path.setAttribute("opacity", "0.65");
    
    // Sleek micro-animation for wind vectors
    const anim = document.createElementNS(svgNS, "animateTransform");
    anim.setAttribute("attributeName", "transform");
    anim.setAttribute("type", "translate");
    anim.setAttribute("values", "0,0; 6,3; 0,0");
    anim.setAttribute("dur", "2.5s");
    anim.setAttribute("repeatCount", "indefinite");
    anim.setAttribute("additive", "sum");
    
    path.appendChild(anim);
    g.appendChild(path);
    svg.appendChild(g);
  });
}
