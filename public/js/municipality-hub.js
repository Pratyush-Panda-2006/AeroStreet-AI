// ============================================
// AeroStreet AI — Municipality Command Hub Controller
// ============================================

import { renderRecommendationsPanel } from './analytics.js';

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

  // Initial render
  updateKPIs();
  renderIncidentLog();
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
    const { hasRsvpd } = e.detail;
    if (hasRsvpd) {
      state.volunteerCount++;
    } else {
      state.volunteerCount = Math.max(0, state.volunteerCount - 1);
    }
    updateKPIs();
  });
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
        <td colspan="7" class="p-8 text-center text-slate-400">
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
    tr.className = 'hover:bg-blue-50/40 transition-colors border-b border-slate-100';
    tr.innerHTML = `
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

    // Click handler for Resolve button
    tr.querySelector('.resolve-btn')?.addEventListener('click', (e) => {
      e.stopPropagation();
      openResolveModal(inc);
    });

    tbody.appendChild(tr);
  });
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
        const freshRec = await fetch('/api/recommendations/delhi', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ incidents: state.incidents })
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
