// ============================================
// AeroStreet AI — Municipality Command Hub Controller
// ============================================

import { renderRecommendationsPanel } from './analytics.js';
import { fetchNearestAQI } from './aqi-api.js';
import { getDb, isFirebaseAvailable } from './firebase-init.js';

// ── Shared Hub State ──
const state = {
  volunteerCount: 124,
  cctvStreamAi: true,
  mfaEnforced: true,
  ipWhitelist: false,
  keyRotation: true,
  incidents: [
    { id: '📹 CAM-A14', type: 'Heavy Smoke', location: 'Anand Vihar, Delhi Industrial Sector', confidence: '94.00%', status: 'Failed Compliance', time: '13:10:22', source: 'cctv' },
    { id: '👤 User #004', type: 'Construction Dust', location: 'Dwarka Sector 21 construction site', confidence: 'N/A', status: 'Warning Active', time: '12:45:00', source: 'citizen' },
    { id: '📹 CAM-M07', type: 'Litter Dumping', location: 'Mahul Industrial, Mumbai Drainage', confidence: '87.00%', status: 'Warning Active', time: '12:15:33', source: 'cctv' },
    { id: '🌿 Command', type: 'Event RSVP Auto', location: 'Yamuna clean-up drive slots filled', confidence: '100.00%', status: 'Success Verified', time: '11:30:10', source: 'command' }
  ]
};

// Expose state to window for analytics refresh requests
window.__municipality_incidents = state.incidents;

/**
 * Initialize Municipality Hub features
 */
export function initMunicipalityHub() {
  console.log('[MuniHub] Initializing interactive features...');
  
  // Wire up Security Toggles
  setupToggles();

  // Wire up RSVP Listeners
  setupRsvplistener();

  // Wire up citizen report listener
  setupReportListener();

  // Initial render
  updateKPIs();
  renderIncidentLog();
  updateWaqiKPI();
  fetchVolunteerCount();
  initForecastSimulator();
  
  // Initialize new visual integrations
  initPollutionHeatmap();
  syncIncidentLogWithFirestore();
  setupBulkActionsBindings();
}

/**
 * Sync and update KPI values at the top of the hub
 */
function updateKPIs() {
  const pendingCount = state.incidents.filter(inc => inc.status !== 'Success Verified').length;
  
  // CCTV Alerts are 0 if CCTV Stream AI policy toggle is OFF
  const activeCctvAlerts = state.cctvStreamAi 
    ? state.incidents.filter(inc => inc.source === 'cctv' && inc.status !== 'Success Verified').length 
    : 0;

  const resolvedCount = state.incidents.filter(inc => inc.status === 'Success Verified').length;

  const pendingKpi = document.getElementById('muni-kpi-pending');
  const cctvKpi = document.getElementById('muni-kpi-cctv');
  const resolvedKpi = document.getElementById('muni-kpi-resolved');
  const volunteersKpi = document.getElementById('muni-kpi-volunteers');

  if (pendingKpi) pendingKpi.textContent = pendingCount;
  if (cctvKpi) cctvKpi.textContent = activeCctvAlerts;
  if (resolvedKpi) resolvedKpi.textContent = resolvedCount + 22; // Keep base index 23 logic
  if (volunteersKpi) volunteersKpi.textContent = state.volunteerCount;
}

/**
 * Set up click listeners for the security toggle switches
 */
function setupToggles() {
  const toggles = [
    { id: 'toggle-cctv-stream', prop: 'cctvStreamAi' },
    { id: 'toggle-mfa', prop: 'mfaEnforced' },
    { id: 'toggle-ip-whitelist', prop: 'ipWhitelist' },
    { id: 'toggle-key-rotation', prop: 'keyRotation' }
  ];

  toggles.forEach(t => {
    const el = document.getElementById(t.id);
    if (!el) return;

    el.addEventListener('click', () => {
      // Toggle state and UI class
      state[t.prop] = !state[t.prop];
      if (state[t.prop]) {
        el.classList.add('active');
      } else {
        el.classList.remove('active');
      }

      window.__aerostreet?.showToast?.(
        `${el.previousElementSibling?.textContent || 'Policy'} toggle: ${state[t.prop] ? 'ACTIVE' : 'INACTIVE'}`, 
        state[t.prop] ? 'success' : 'info'
      );

      // Re-trigger layout filter updates
      updateKPIs();
      renderIncidentLog();
    });
  });
}

/**
 * Handle custom event updates from the community RSVPs panel
 */
function setupRsvplistener() {
  window.addEventListener('rsvp-updated', (e) => {
    const { hasRsvpd, volunteerCount } = e.detail;
    if (volunteerCount !== undefined) {
      state.volunteerCount = volunteerCount;
    } else {
      if (hasRsvpd) {
        state.volunteerCount++;
      } else {
        state.volunteerCount = Math.max(0, state.volunteerCount - 1);
      }
    }
    updateKPIs();
  });
}

/**
 * Handle custom event updates from citizen quick report submission
 */
function setupReportListener() {
  window.addEventListener('report-submitted', (e) => {
    const { report } = e.detail;
    if (report) {
      // Prepend to incidents list
      state.incidents.unshift(report);
      window.__municipality_incidents = state.incidents;
      
      // Update KPIs and table
      updateKPIs();
      renderIncidentLog();
      
      console.log('[MuniHub] Appended new report:', report.id);
    }
  });
}

/**
 * Fetch total volunteer count from active drives API
 */
async function fetchVolunteerCount() {
  try {
    const response = await fetch('/api/drives');
    if (response.ok) {
      const data = await response.json();
      if (data && data.success && data.drives) {
        const total = data.drives.reduce((sum, d) => sum + (d.slotsFilled || 0), 0);
        state.volunteerCount = total;
        updateKPIs();
      }
    }
  } catch (err) {
    console.warn('[MuniHub] Failed to fetch volunteer count from Express:', err.message);
  }
}

/**
 * Render the Incident Log table rows
 */
function renderIncidentLog() {
  const tbody = document.getElementById('incident-log-body');
  if (!tbody) return;

  // Filter based on CCTV Stream AI policy toggle
  const visibleIncidents = state.cctvStreamAi 
    ? state.incidents 
    : state.incidents.filter(inc => inc.source !== 'cctv');

  tbody.innerHTML = '';

  if (visibleIncidents.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="8" class="p-8 text-center text-slate-400">
          <span class="material-symbols-outlined text-3xl mb-1 block">checklist</span>
          No incidents logged or policies filtering current view.
        </td>
      </tr>
    `;
    return;
  }

  visibleIncidents.forEach(inc => {
    const isResolved = inc.status === 'Success Verified';
    
    // Status Badge Styling
    let statusClass = 'bg-slate-100 text-slate-800';
    if (inc.status === 'Failed Compliance') statusClass = 'bg-red-100 text-red-800';
    else if (inc.status === 'Warning Active') statusClass = 'bg-amber-100 text-amber-800';
    else if (inc.status === 'Success Verified') statusClass = 'bg-green-100 text-green-800';

    const tr = document.createElement('tr');
    tr.className = 'hover:bg-blue-50/40 transition-colors border-b border-slate-100 cursor-pointer';
    tr.innerHTML = `
      <td class="p-3 w-8">
        <input type="checkbox" data-checkbox-id="${inc.id}" class="row-checkbox rounded border-slate-300 text-primary focus:ring-primary" onclick="event.stopPropagation()"/>
      </td>
      <td class="p-3 font-semibold text-slate-900">${inc.id}</td>
      <td class="p-3">${inc.type}</td>
      <td class="p-3 text-slate-500 max-w-[200px] truncate" title="${inc.location}">${inc.location}</td>
      <td class="p-3 font-mono font-medium text-slate-600">${inc.confidence}</td>
      <td class="p-3">
        <span class="px-2 py-0.5 rounded-full text-[9px] font-bold ${statusClass}">
          ${inc.status}
        </span>
      </td>
      <td class="p-3">
        ${isResolved 
          ? `<span class="text-green-600 flex items-center gap-1"><span class="material-symbols-outlined text-sm">done_all</span>Resolved</span>`
          : `<button data-id="${inc.id}" class="resolve-btn px-2 py-1 bg-primary text-white hover:bg-primary-hover text-[10px] font-bold rounded-btn transition-colors flex items-center gap-1 shadow-sm">
               <span class="material-symbols-outlined text-[12px]">check_circle</span> Resolve
             </button>`
        }
      </td>
      <td class="p-3 text-right text-slate-400 font-mono">${inc.time}</td>
    `;

    // Row Click Expansion handler
    tr.addEventListener('click', (e) => {
      if (e.target.closest('input') || e.target.closest('button') || e.target.closest('select')) {
        return;
      }
      toggleRowExpansion(tr, inc);
    });

    // Click handler for Resolve button
    tr.querySelector('.resolve-btn')?.addEventListener('click', (e) => {
      e.stopPropagation();
      openResolveModal(inc);
    });

    // Checkbox Click event to toggle bulk actions panel
    tr.querySelector('.row-checkbox').addEventListener('change', () => {
      updateBulkActionsPanel();
    });

    tbody.appendChild(tr);
  });

  // Re-sync "select all" state
  updateBulkActionsPanel();
}

/**
 * Open Resolve Incident dialog modal
 * @param {object} incident
 */
function openResolveModal(incident) {
  // Remove existing if duplicate
  const existing = document.getElementById('resolve-modal-overlay');
  if (existing) existing.remove();

  const overlay = document.createElement('div');
  overlay.id = 'resolve-modal-overlay';
  overlay.className = 'fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm';
  overlay.innerHTML = `
    <div class="bg-white rounded-card shadow-2xl border border-slate-200 w-full max-w-md mx-4 overflow-hidden animate-[fadeIn_0.2s_ease-out]">
      <!-- Header -->
      <div class="p-6 pb-4 border-b border-slate-100 bg-gradient-to-r from-blue-50/10 to-transparent">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center text-primary">
              <span class="material-symbols-outlined">gavel</span>
            </div>
            <div>
              <h2 class="text-base font-bold text-slate-800">Resolve Operations Incident</h2>
              <p class="text-[10px] text-slate-400">Incident: ${incident.id} (${incident.type})</p>
            </div>
          </div>
          <button id="resolve-close-btn" class="w-8 h-8 rounded-full hover:bg-slate-100 flex items-center justify-center transition-colors">
            <span class="material-symbols-outlined text-slate-500">close</span>
          </button>
        </div>
      </div>
      
      <!-- Body -->
      <form id="resolve-form" class="p-6 space-y-4">
        <div class="text-xs text-slate-600 bg-slate-50 border border-slate-100 p-3 rounded-lg">
          <strong>Location:</strong> ${incident.location}<br/>
          <strong>Confidence Score:</strong> ${incident.confidence}
        </div>
        
        <div>
          <label class="block text-[10px] font-bold text-slate-400 mb-1 uppercase tracking-wider">Action Dispatched</label>
          <select id="resolve-action" required class="w-full px-4 py-2.5 rounded-lg border border-slate-200 bg-white text-slate-800 text-xs focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-colors">
            <option value="sprinkler">Dispatch Water Sprinkler</option>
            <option value="fine">Issue Pollution Fine</option>
            <option value="ack">Acknowledge & Archive Alert</option>
          </select>
        </div>
        
        <div>
          <label class="block text-[10px] font-bold text-slate-400 mb-1 uppercase tracking-wider">Remarks / Notes</label>
          <textarea id="resolve-remarks" rows="2" placeholder="Enter resolution remarks..." required class="w-full px-4 py-2.5 rounded-lg border border-slate-200 bg-white text-slate-800 text-xs focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-colors resize-none"></textarea>
        </div>
        
        <button type="submit" class="w-full py-2.5 bg-success hover:bg-green-700 text-white rounded-btn text-xs font-semibold transition-colors flex items-center justify-center gap-2">
          <span class="material-symbols-outlined text-[18px]">check_circle</span>
          Verify Resolution
        </button>
      </form>
    </div>
  `;

  document.body.appendChild(overlay);

  // Close handlers
  document.getElementById('resolve-close-btn').addEventListener('click', () => overlay.remove());
  overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });

  // Submit Handler
  document.getElementById('resolve-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    // Find incident and update status to Success Verified
    const targetIdx = state.incidents.findIndex(inc => inc.id === incident.id);
    if (targetIdx !== -1) {
      state.incidents[targetIdx].status = 'Success Verified';
      
      // Update exposed window property
      window.__municipality_incidents = state.incidents;
    }

    overlay.remove();
    window.__aerostreet?.showToast?.(`Incident ${incident.id} successfully resolved!`, 'success');

    // Re-render UI panels
    updateKPIs();
    renderIncidentLog();

    // Auto-update AI Recommendations immediately based on updated state log!
    const recContainer = document.getElementById('ai-recommendations');
    if (recContainer) {
      recContainer.innerHTML = `
        <div class="flex items-center justify-center py-8 gap-3 text-slate-400">
          <span class="material-symbols-outlined animate-spin">progress_activity</span>
          <span class="text-xs">Updating AI recommendations...</span>
        </div>
      `;
      try {
        const waqiAqiVal = parseInt(document.getElementById('muni-kpi-waqi')?.textContent) || 345;
        const freshRec = await fetch('/api/recommendations/delhi', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            incidents: state.incidents,
            weather: {
              aqi: waqiAqiVal,
              windSpeed: 12,
              windDirection: 'North-East',
              temp: 28
            }
          })
        });
        if (freshRec.ok) {
          const res = await freshRec.json();
          if (res && res.success && res.data) {
            await renderRecommendationsPanel('ai-recommendations', 'delhi', res.data);
          }
        }
      } catch (err) {
        console.warn('[MuniHub] Failed to auto-refresh recommendations on resolve:', err.message);
        await renderRecommendationsPanel('ai-recommendations', 'delhi');
      }
    }
  });
}

/**
 * Fetch and update live WAQI station KPI
 */
async function updateWaqiKPI() {
  const waqiVal = document.getElementById('muni-kpi-waqi');
  const waqiName = document.getElementById('muni-kpi-waqi-name');
  const waqiIndicator = document.getElementById('muni-kpi-waqi-indicator');

  if (!waqiVal) return;

  try {
    // Delhi center coordinates for control center
    const data = await fetchNearestAQI(28.6139, 77.2090); 
    if (data && data.aqi !== 'N/A' && !isNaN(data.aqi)) {
      waqiVal.textContent = data.aqi;
      waqiName.textContent = data.stationName.split(',')[0];
      waqiName.title = data.stationName;
      
      const { getAQILevel } = await import('./config.js');
      const level = getAQILevel(data.aqi);
      
      // Style based on level
      waqiIndicator.style.backgroundColor = `${level.color}15`;
      waqiIndicator.style.borderColor = `${level.color}30`;
      waqiIndicator.style.color = level.color;
      waqiVal.style.color = level.color;
    } else {
      waqiVal.textContent = 'Offline';
      waqiName.textContent = 'Demo Mode Active';
    }
  } catch (err) {
    console.warn('[MuniHub] Failed to fetch live WAQI data:', err.message);
    waqiVal.textContent = 'Offline';
    waqiName.textContent = 'Error Loading Feed';
  }
}

/**
 * Initialize and update the interactive ML AQI Forecast Simulator
 */
function initForecastSimulator() {
  const trafficSlider = document.getElementById('slider-traffic');
  const industrialSlider = document.getElementById('slider-industrial');
  const windSlider = document.getElementById('slider-wind');
  const tempSlider = document.getElementById('slider-temp');

  if (!trafficSlider) return;

  const trafficVal = document.getElementById('slider-traffic-val');
  const industrialVal = document.getElementById('slider-industrial-val');
  const windVal = document.getElementById('slider-wind-val');
  const tempVal = document.getElementById('slider-temp-val');

  const peakVal = document.getElementById('forecast-peak-val');
  const peakDot = document.getElementById('forecast-peak-dot');
  const hotspotTime = document.getElementById('forecast-hotspot-time');
  const actionRec = document.getElementById('forecast-action-rec');
  const chartSvg = document.getElementById('forecast-svg-chart');

  // Interactive update helper
  const runSimulation = () => {
    // 1. Update text badges
    trafficVal.textContent = `${trafficSlider.value}%`;
    industrialVal.textContent = `${industrialSlider.value}%`;
    windVal.textContent = `${windSlider.value} km/h`;
    tempVal.textContent = `${tempSlider.value}°C`;

    // 2. Read input parameters
    const traffic = parseInt(trafficSlider.value);
    const industrial = parseInt(industrialSlider.value);
    const wind = parseInt(windSlider.value);
    const temp = parseInt(tempSlider.value);

    // Get current base AQI (read from live card or default to 110)
    const baseAqiText = document.getElementById('muni-kpi-waqi')?.textContent;
    const baseAqi = (baseAqiText && !isNaN(baseAqiText)) ? parseInt(baseAqiText) : 110;

    // 3. Generate 24 hourly predictions using regression heuristics (Mock ML Model)
    const hourlyData = [];
    let maxAqi = 0;
    let maxHourIdx = 0;

    const currentHour = new Date().getHours();

    for (let h = 0; h < 24; h++) {
      const forecastHour = (currentHour + h) % 24;
      
      // Heuristic factors
      // Diurnal variation: rush hour peaks (8-10 AM, 5-7 PM)
      let diurnal = 0;
      if (forecastHour >= 8 && forecastHour <= 10) {
        diurnal = 35; // morning rush hour
      } else if (forecastHour >= 17 && forecastHour <= 19) {
        diurnal = 45; // evening rush hour
      } else if (forecastHour >= 0 && forecastHour <= 5) {
        diurnal = 15; // night inversion
      } else if (forecastHour >= 12 && forecastHour <= 15) {
        diurnal = -15; // afternoon mixing
      }

      // Linear regression coefficients matching environmental dynamics:
      const trafficEffect = (traffic - 100) * 0.45;
      const industrialEffect = (industrial - 100) * 0.35;
      const windEffect = - (wind - 12) * 1.8;
      const tempEffect = (temp - 28) * 0.4;

      // Predict AQI for the hour
      let hourlyAqi = Math.round(baseAqi + diurnal + trafficEffect + industrialEffect + windEffect + tempEffect);
      hourlyAqi = Math.max(10, Math.min(500, hourlyAqi)); // clamp to valid ranges

      hourlyData.push(hourlyAqi);

      if (hourlyAqi > maxAqi) {
        maxAqi = hourlyAqi;
        maxHourIdx = h;
      }
    }

    // 4. Update UI labels
    if (peakVal) peakVal.textContent = maxAqi;
    
    // Determine color coding for peak
    let peakColor = '#16a34a'; // good
    let alertText = '🟢 Healthy forecast. No restrictions or alerts required.';
    if (maxAqi > 200) {
      peakColor = '#dc2626'; // severe (red)
      alertText = '🔴 Severe spike predicted. Enforce odd-even traffic scheme and suspend heavy construction.';
    } else if (maxAqi > 100) {
      peakColor = '#d97706'; // moderate (orange)
      alertText = '🟡 Poor air quality alert. Activate roadside dust suppressants & smog towers.';
    } else if (maxAqi > 50) {
      peakColor = '#eab308'; // moderate warning (yellow)
      alertText = '🔵 Moderate warning. Encourage public transit and limit industrial emissions.';
    }
    
    if (peakDot) peakDot.style.backgroundColor = peakColor;
    
    const peakHourTime = new Date();
    peakHourTime.setHours(peakHourTime.getHours() + maxHourIdx);
    const peakTimeStr = peakHourTime.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
    if (hotspotTime) hotspotTime.textContent = `${peakTimeStr} (+${maxHourIdx}h)`;
    if (actionRec) actionRec.textContent = alertText;

    // 5. Draw dynamic SVG chart
    if (chartSvg) {
      const svgWidth = 500;
      const svgHeight = 120;
      const padding = 15;
      
      const minAqiInDataset = Math.min(...hourlyData);
      const maxAqiInDataset = Math.max(...hourlyData);
      const aqiRange = (maxAqiInDataset - minAqiInDataset) || 50;

      // Map each point (h, aqi) to (x, y) coordinates
      const points = hourlyData.map((aqi, i) => {
        const x = padding + (i / 23) * (svgWidth - 2 * padding);
        // Math.min/max coordinates mapping: map min to height-15 and max to 10
        const y = (svgHeight - padding) - ((aqi - minAqiInDataset) / aqiRange) * (svgHeight - 2 * padding - 10);
        return { x, y, aqi };
      });

      // Create path strings
      const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ');
      const areaPath = `${linePath} L ${points[23].x.toFixed(1)} ${svgHeight - padding} L ${points[0].x.toFixed(1)} ${svgHeight - padding} Z`;

      // Render contents inside SVG
      chartSvg.innerHTML = `
        <defs>
          <linearGradient id="chart-area-grad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="${peakColor}" stop-opacity="0.25"/>
            <stop offset="100%" stop-color="${peakColor}" stop-opacity="0.0"/>
          </linearGradient>
          <linearGradient id="chart-line-grad" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stop-color="#2563eb"/>
            <stop offset="50%" stop-color="${peakColor}"/>
            <stop offset="100%" stop-color="#4f46e5"/>
          </linearGradient>
        </defs>
        <!-- Horizontal grid lines -->
        <line x1="${padding}" y1="${svgHeight - padding}" x2="${svgWidth - padding}" y2="${svgHeight - padding}" stroke="#f1f5f9" stroke-width="1.5" />
        <line x1="${padding}" y1="${svgHeight / 2}" x2="${svgWidth - padding}" y2="${svgHeight / 2}" stroke="#f1f5f9" stroke-dasharray="3,3" stroke-width="1" />
        <line x1="${padding}" y1="${padding}" x2="${svgWidth - padding}" y2="${padding}" stroke="#f1f5f9" stroke-width="1" />

        <!-- Area under the curve -->
        <path d="${areaPath}" fill="url(#chart-area-grad)" />
        <!-- The forecast trend line -->
        <path d="${linePath}" fill="none" stroke="url(#chart-line-grad)" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" />

        <!-- Highlight peak point -->
        <circle cx="${points[maxHourIdx].x.toFixed(1)}" cy="${points[maxHourIdx].y.toFixed(1)}" r="5" fill="${peakColor}" stroke="#ffffff" stroke-width="1.5" />
        <text x="${points[maxHourIdx].x.toFixed(1)}" y="${(points[maxHourIdx].y - 8).toFixed(1)}" text-anchor="middle" font-size="9px" font-weight="bold" fill="#334155" font-family="monospace">${maxAqi}</text>
      `;
    }
  };

  // Add event listeners
  trafficSlider.addEventListener('input', runSimulation);
  industrialSlider.addEventListener('input', runSimulation);
  windSlider.addEventListener('input', runSimulation);
  tempSlider.addEventListener('input', runSimulation);

  // Initial Run (slight delay to let WAQI KPI load first)
  setTimeout(runSimulation, 800);
}

// ── Pollution Heatmap and Checkbox Helpers ──

const grayscaleMapStyle = [
  { "elementType": "geometry", "stylers": [{ "color": "#f5f5f5" }] },
  { "elementType": "labels.text.fill", "stylers": [{ "color": "#616161" }] },
  { "elementType": "labels.text.stroke", "stylers": [{ "color": "#f5f5f5" }] },
  { "featureType": "administrative.land_parcel", "elementType": "labels.text.fill", "stylers": [{ "color": "#bdbdbd" }] },
  { "featureType": "poi", "elementType": "geometry", "stylers": [{ "color": "#eeeeee" }] },
  { "featureType": "poi", "elementType": "labels.text.fill", "stylers": [{ "color": "#757575" }] },
  { "featureType": "road", "elementType": "geometry", "stylers": [{ "color": "#ffffff" }] },
  { "featureType": "water", "elementType": "geometry", "stylers": [{ "color": "#c9c9c9" }] }
];

let heatmapMapInstance = null;

async function initPollutionHeatmap() {
  const canvas = document.getElementById('muni-heatmap-canvas');
  if (!canvas) return;

  const apiKey = window.__AEROSTREET_CONFIG__?.googleMapsApiKey;
  
  try {
    if (!window.google || !window.google.maps) {
      const { loadGoogleMapsScript } = await import('./predictive-map.js').catch(() => ({}));
      if (loadGoogleMapsScript) {
        await loadGoogleMapsScript(apiKey);
      }
    }
    
    if (!window.google || !window.google.maps) return;

    heatmapMapInstance = new google.maps.Map(canvas, {
      center: { lat: 28.6139, lng: 77.2090 },
      zoom: 11,
      styles: grayscaleMapStyle,
      mapTypeControl: false,
      streetViewControl: false,
      zoomControl: true
    });

    const heatmapPoints = [
      { location: new google.maps.LatLng(28.6476, 77.3158), weight: 9 },
      { location: new google.maps.LatLng(28.5355, 77.2639), weight: 7 },
      { location: new google.maps.LatLng(28.6304, 77.2177), weight: 4 },
      { location: new google.maps.LatLng(28.7495, 77.1205), weight: 6 },
      { location: new google.maps.LatLng(28.4900, 77.0800), weight: 8 }
    ];

    new google.maps.visualization.HeatmapLayer({
      data: heatmapPoints,
      map: heatmapMapInstance,
      radius: 40
    });

  } catch (e) {
    console.warn('[MuniHub] Heatmap initialization failed:', e);
    canvas.innerHTML = `
      <div class="w-full h-full flex flex-col items-center justify-center bg-slate-50 text-slate-400 text-xs">
        <span class="material-symbols-outlined text-3xl mb-1">map</span>
        Google Maps SDK failed to load.
      </div>
    `;
  }
}

function toggleRowExpansion(tr, inc) {
  const next = tr.nextElementSibling;
  if (next && next.classList.contains('expansion-row')) {
    next.remove();
    tr.classList.remove('bg-blue-50/20');
    return;
  }
  
  const tbody = document.getElementById('incident-log-body');
  tbody.querySelectorAll('.expansion-row').forEach(r => r.remove());
  tbody.querySelectorAll('tr').forEach(r => r.classList.remove('bg-blue-50/20'));

  tr.classList.add('bg-blue-50/20');

  const expTr = document.createElement('tr');
  expTr.className = 'bg-slate-50/80 expansion-row';
  expTr.innerHTML = `
    <td colspan="8" class="p-4 border-b border-slate-200">
      <div class="flex flex-col sm:flex-row gap-6 animate-[fadeIn_0.2s_ease-out]">
        <div class="flex-1 min-w-[280px]">
          <p class="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5 flex items-center gap-1">
            <span class="material-symbols-outlined text-[12px] text-primary">location_on</span> Geolocation Map
          </p>
          <div class="w-full h-40 rounded-xl overflow-hidden border border-slate-200 bg-slate-100 relative shadow-sm">
            <iframe class="w-full h-full border-0" 
              src="https://maps.google.com/maps?q=${inc.lat || 28.6139},${inc.lng || 77.2090}&z=15&output=embed&t=m">
            </iframe>
            <div class="absolute bottom-2 left-2 bg-slate-900/90 text-white text-[9px] font-mono px-2 py-0.5 rounded shadow">
              Coords: ${(inc.lat || 28.6139).toFixed(4)}, ${(inc.lng || 77.2090).toFixed(4)}
            </div>
          </div>
        </div>
        <div class="w-full sm:w-64">
          <p class="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5 flex items-center gap-1">
            <span class="material-symbols-outlined text-[12px] text-error">visibility</span> Alert Evidence Snapshot
          </p>
          <div class="w-full h-40 rounded-xl overflow-hidden border border-slate-200 bg-slate-100 relative shadow-sm">
            ${inc.cctvPreview 
              ? `<img src="${inc.cctvPreview}" class="w-full h-full object-cover"/>`
              : `<div class="w-full h-full flex flex-col items-center justify-center text-slate-400 p-2 text-center bg-slate-50">
                   <span class="material-symbols-outlined text-2xl mb-1">no_photography</span>
                   <span class="text-[10px] font-semibold">No CCTV snapshot available (Citizen Report)</span>
                 </div>`
            }
            <div class="absolute top-2 right-2 bg-slate-900/90 text-white text-[8px] font-bold px-1.5 py-0.5 rounded shadow uppercase">
              ${inc.source === 'cctv' ? 'AI CCTV CAM' : 'Citizen Upload'}
            </div>
          </div>
        </div>
      </div>
    </td>
  `;
  
  tr.after(expTr);
}

function updateBulkActionsPanel() {
  const checkboxes = document.querySelectorAll('.row-checkbox');
  const checked = document.querySelectorAll('.row-checkbox:checked');
  const selectAll = document.getElementById('bulk-select-all');
  const panel = document.getElementById('bulk-actions-panel');
  const countSpan = document.getElementById('bulk-selected-count');

  if (!panel || !countSpan) return;

  if (checked.length > 0) {
    panel.classList.remove('hidden');
    countSpan.textContent = `${checked.length} item${checked.length > 1 ? 's' : ''} selected`;
  } else {
    panel.classList.add('hidden');
  }

  if (selectAll) {
    selectAll.checked = checkboxes.length > 0 && checked.length === checkboxes.length;
  }
}

function setupBulkActionsBindings() {
  const selectAll = document.getElementById('bulk-select-all');
  if (selectAll) {
    selectAll.addEventListener('change', () => {
      const checked = selectAll.checked;
      document.querySelectorAll('.row-checkbox').forEach(cb => {
        cb.checked = checked;
      });
      updateBulkActionsPanel();
    });
  }

  const bulkDispatchBtn = document.getElementById('bulk-dispatch-btn');
  if (bulkDispatchBtn) {
    bulkDispatchBtn.addEventListener('click', () => {
      const checkedCbs = document.querySelectorAll('.row-checkbox:checked');
      const ids = Array.from(checkedCbs).map(cb => cb.dataset.checkboxId);
      
      simulateFcmPushNotification('Field Team Dispatched', `Teams sent to inspect ${ids.length} violations: ${ids.join(', ')}.`);
      
      checkedCbs.forEach(cb => cb.checked = false);
      updateBulkActionsPanel();
    });
  }

  const bulkResolveBtn = document.getElementById('bulk-resolve-btn');
  if (bulkResolveBtn) {
    bulkResolveBtn.addEventListener('click', () => {
      const checkedCbs = document.querySelectorAll('.row-checkbox:checked');
      const ids = Array.from(checkedCbs).map(cb => cb.dataset.checkboxId);
      
      ids.forEach(id => {
        const idx = state.incidents.findIndex(inc => inc.id === id);
        if (idx !== -1) {
          state.incidents[idx].status = 'Success Verified';
        }
      });
      
      window.__municipality_incidents = state.incidents;
      window.__aerostreet?.showToast?.(`Successfully resolved ${ids.length} selected incidents!`, 'success');
      
      renderIncidentLog();
      updateKPIs();
    });
  }
}

// ── Firestore Snapshot & Simulator Sync ──

async function syncIncidentLogWithFirestore() {
  const isAvailable = isFirebaseAvailable();
  if (isAvailable) {
    try {
      const db = await getDb();
      const { collection, onSnapshot, query, orderBy } = await import('https://www.gstatic.com/firebasejs/11.6.0/firebase-firestore.js');
      
      const q = query(collection(db, 'reports'), orderBy('createdAt', 'desc'));
      
      onSnapshot(q, (snapshot) => {
        const fbIncidents = snapshot.docs.map(doc => {
          const data = doc.data();
          const time = data.createdAt ? new Date(data.createdAt).toTimeString().split(' ')[0] : new Date().toTimeString().split(' ')[0];
          return {
            id: `👤 Report-${doc.id.substring(0, 4)}`,
            type: data.category || 'Citizen Report',
            location: data.description || 'Reported Location',
            confidence: data.confidence ? `${data.confidence}.00%` : 'N/A',
            status: 'Warning Active',
            time: time,
            source: 'citizen',
            lat: data.lat || 28.6139,
            lng: data.lng || 77.2090
          };
        });

        const baseStatic = [
          { id: '📹 CAM-A14', type: 'Heavy Smoke', location: 'Anand Vihar, Delhi Industrial Sector', confidence: '94.00%', status: 'Failed Compliance', time: '13:10:22', source: 'cctv', lat: 28.6476, lng: 77.3158, cctvPreview: 'https://images.unsplash.com/photo-1590486803833-ffc6de2715d4?auto=format&fit=crop&w=400&q=80' },
          { id: '👤 User #004', type: 'Construction Dust', location: 'Dwarka Sector 21 construction site', confidence: 'N/A', status: 'Warning Active', time: '12:45:00', source: 'citizen', lat: 28.5823, lng: 77.0500 },
          { id: '📹 CAM-M07', type: 'Litter Dumping', location: 'Mahul Industrial, Mumbai Drainage', confidence: '87.00%', status: 'Warning Active', time: '12:15:33', source: 'cctv', lat: 19.0012, lng: 72.9150, cctvPreview: 'https://images.unsplash.com/photo-1618477388954-7852f32655ec?auto=format&fit=crop&w=400&q=80' },
          { id: '🌿 Command', type: 'Event RSVP Auto', location: 'Yamuna clean-up drive slots filled', confidence: '100.00%', status: 'Success Verified', time: '11:30:10', source: 'command', lat: 28.6139, lng: 77.2090 }
        ];

        state.incidents = [...fbIncidents, ...baseStatic];
        window.__municipality_incidents = state.incidents;
        updateKPIs();
        renderIncidentLog();
      });
      
    } catch (err) {
      console.warn('[MuniHub] Firestore snapshot listener failed:', err);
    }
  }

  setupSimulationLoop();
}

const MOCK_TYPES = ['Heavy Smoke', 'Construction Dust', 'Litter Dumping', 'Open Burning', 'Industrial Emission'];
const MOCK_LOCATIONS = [
  'Anand Vihar Industrial Area',
  'Connaught Place Inner Circle',
  'Okhla Phase III',
  'Dwarka Sector 10 Construction Zone',
  'Rohini Sector 16',
  'Gurugram Phase II Sector 45'
];
const MOCK_SOURCES = ['cctv', 'citizen'];
const MOCK_IDS = {
  cctv: () => `📹 CAM-${String.fromCharCode(65 + Math.floor(Math.random() * 26))}${Math.floor(Math.random() * 90 + 10)}`,
  citizen: () => `👤 Citizen #${Math.floor(Math.random() * 900 + 100)}`
};

function generateMockIncident() {
  const source = MOCK_SOURCES[Math.floor(Math.random() * MOCK_SOURCES.length)];
  const type = MOCK_TYPES[Math.floor(Math.random() * MOCK_TYPES.length)];
  const loc = MOCK_LOCATIONS[Math.floor(Math.random() * MOCK_LOCATIONS.length)];
  const id = MOCK_IDS[source]();
  const time = new Date().toTimeString().split(' ')[0];
  
  return {
    id,
    type,
    location: loc,
    confidence: source === 'cctv' ? `${(Math.random() * 20 + 80).toFixed(2)}%` : 'N/A',
    status: 'Warning Active',
    time,
    source,
    lat: 28.5 + (Math.random() - 0.5) * 0.3,
    lng: 77.1 + (Math.random() - 0.5) * 0.3,
    cctvPreview: source === 'cctv' ? `https://images.unsplash.com/photo-1590486803833-ffc6de2715d4?auto=format&fit=crop&w=400&q=80` : null
  };
}

function setupSimulationLoop() {
  setInterval(async () => {
    const mock = generateMockIncident();
    
    if (isFirebaseAvailable()) {
      try {
        const db = await getDb();
        const { collection, addDoc } = await import('https://www.gstatic.com/firebasejs/11.6.0/firebase-firestore.js');
        await addDoc(collection(db, 'reports'), {
          category: mock.type,
          description: mock.location,
          confidence: Math.round(parseFloat(mock.confidence)) || 85,
          createdAt: new Date().toISOString(),
          lat: mock.lat,
          lng: mock.lng
        });
        window.__aerostreet?.showToast?.(`[Live Sync] Injected new report to Firestore: ${mock.id}`, 'info');
      } catch (err) {
        console.warn('[MuniHub] Failed to inject to Firestore, using local fallback:', err);
        injectLocally(mock);
      }
    } else {
      injectLocally(mock);
    }
  }, 30000);
}

function injectLocally(mock) {
  state.incidents.unshift(mock);
  window.__municipality_incidents = state.incidents;
  updateKPIs();
  renderIncidentLog();
  
  window.__aerostreet?.showToast?.(`[Real-time Alert] New event reported: ${mock.id}`, 'warning');

  // Trigger browser push alert if it is critical or randomly
  if (mock.source === 'cctv' || Math.random() > 0.5) {
    simulateFcmPushNotification(`Critical Alert: ${mock.type}`, `${mock.location} requires immediate compliance inspection.`);
  }
}

/**
 * Trigger simulated browser push alert chime + banner
 */
function simulateFcmPushNotification(title, message) {
  if ('Notification' in window) {
    if (Notification.permission === 'granted') {
      new Notification(title, { body: message });
    } else if (Notification.permission !== 'denied') {
      Notification.requestPermission().then(permission => {
        if (permission === 'granted') {
          new Notification(title, { body: message });
        }
      });
    }
  }
  
  window.__aerostreet?.showToast?.(`[FCM ALERT] ${title}: ${message}`, 'error');
  
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.setValueAtTime(880, ctx.currentTime);
    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    osc.start();
    osc.stop(ctx.currentTime + 0.15);
  } catch(e) {}
}
