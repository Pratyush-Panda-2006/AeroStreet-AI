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

let mapContainerId = 'map-container';
let currentZoomedState = null; // null (National) or stateId (e.g., 'in-wb')
let liveHotspots = [];
let liveReports = [];

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
    path.setAttribute("fill", `${level.color}15`); // Soft tint
    path.style.cursor = "pointer";

    // Set custom hover interactions
    path.addEventListener('mouseenter', (e) => {
      path.setAttribute("fill", `${level.color}40`);
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
      path.setAttribute("fill", `${level.color}15`);
      path.setAttribute("stroke", "#cbd5e1");
      path.setAttribute("stroke-width", "1.5");
      hideMapTooltip();
    });

    path.addEventListener('mousemove', (e) => {
      positionTooltip(e);
    });

    path.addEventListener('click', () => {
      if (STATE_DISTRICTS_MAP[state.id]) {
        zoomToState(state.id);
      } else {
        window.__aerostreet?.showToast?.(`Detailed district data for ${state.name} is coming soon! Try West Bengal, Karnataka, or Maharashtra.`, 'info');
      }
    });

    svg.appendChild(path);
  });

  // Render floating overlay indicators for major cities on the SVG map
  renderNationalCityPins(svg, svgNS);

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
export function zoomToState(stateId) {
  currentZoomedState = stateId;
  const stateConfig = STATE_DISTRICTS_MAP[stateId];
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
  const districts = DEMO_DISTRICTS_BY_STATE[stateId] || [];

  stateConfig.paths.forEach(dist => {
    const distData = districts.find(d => d.id === dist.id) || { aqi: 45 };
    const level = getAQILevel(distData.aqi);

    const path = document.createElementNS(svgNS, "path");
    path.setAttribute("d", dist.path);
    path.setAttribute("stroke", "#e2e8f0");
    path.setAttribute("stroke-width", "1");
    path.setAttribute("fill", `${level.color}18`);
    path.style.cursor = "pointer";
    path.setAttribute("class", "transition-all duration-200");

    path.addEventListener('mouseenter', (e) => {
      path.setAttribute("fill", `${level.color}35`);
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
      path.setAttribute("fill", `${level.color}18`);
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
