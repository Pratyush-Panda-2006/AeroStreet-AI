// ============================================
// AeroStreet AI — Analytics & AI Recommendations
// ============================================
// Track 2: Frontend consumer for AI-powered recommendations
// from Gemini. Fetches insights from Firestore or server API.

import { IS_DEMO_MODE, API_BASE_URL, getAQILevel } from './config.js';
import { getDb, COLLECTIONS, isFirebaseAvailable } from './firebase-init.js';

// ── Demo AI Recommendations ──
const DEMO_RECOMMENDATIONS = [
  {
    id: 'rec-1',
    districtId: 'delhi',
    districtName: 'Delhi NCT',
    generatedAt: '2026-07-05T06:00:00Z',
    dataContext: { hotspotCount: 12, avgAQI: 345, peakHours: ['8:00-10:00', '17:00-20:00'] },
    recommendations: [
      {
        priority: 'critical',
        title: 'Immediate Heavy Vehicle Diversion',
        description: 'Recommend diverting all heavy commercial vehicles (>10T) from Ring Road between 5 PM - 9 PM. Traffic data shows 68% of PM2.5 spikes correlate with diesel truck congestion during evening rush.',
        impact: 'Estimated 15-20% PM2.5 reduction during peak hours',
        icon: 'local_shipping',
      },
      {
        priority: 'high',
        title: 'Deploy Emergency Water Sprinklers',
        description: 'Deploy mobile water sprinkler units along Anand Vihar and ITO corridors. Dust re-suspension from unpaved shoulders accounts for ~30% of coarse particulate readings.',
        impact: 'Estimated 10-15% reduction in PM10 levels',
        icon: 'water_drop',
      },
      {
        priority: 'medium',
        title: 'Enforce Construction Site DCPC Norms',
        description: 'Three active construction sites in Dwarka Sector 21 are operating without mandatory dust control measures. Issue compliance notices immediately.',
        impact: 'Localized 25% improvement within 500m radius',
        icon: 'construction',
      },
      {
        priority: 'info',
        title: 'Schedule Citizen Cleanup Drive',
        description: 'Community report density is highest near Yamuna Ghat (8 reports/week). Coordinate with local NGOs for a weekend cleanup drive to reduce open dumping.',
        impact: 'Improved community engagement score by 40%',
        icon: 'volunteer_activism',
      },
    ],
  },
  {
    id: 'rec-2',
    districtId: 'mumbai',
    districtName: 'Mumbai',
    generatedAt: '2026-07-05T06:00:00Z',
    dataContext: { hotspotCount: 5, avgAQI: 142, peakHours: ['7:30-9:30', '18:00-20:30'] },
    recommendations: [
      {
        priority: 'high',
        title: 'Industrial Zone Monitoring',
        description: 'CCTV analysis shows recurring heavy smoke events at Mahul Industrial Zone between 6-8 AM. Deploy air quality mobile units for source identification.',
        impact: 'Identify top 3 emission sources for enforcement',
        icon: 'factory',
      },
      {
        priority: 'medium',
        title: 'Green Corridor Optimization',
        description: 'Traffic signal optimization on Western Express Highway can reduce idling emissions by synchronizing green waves during 7:30-9:30 AM.',
        impact: 'Estimated 8% reduction in vehicular NOx',
        icon: 'traffic',
      },
    ],
  },
];

const DEMO_AQI_TRENDS = {
  delhi: [
    { date: '2026-06-29', aqi: 280 }, { date: '2026-06-30', aqi: 310 },
    { date: '2026-07-01', aqi: 290 }, { date: '2026-07-02', aqi: 345 },
    { date: '2026-07-03', aqi: 320 }, { date: '2026-07-04', aqi: 355 },
    { date: '2026-07-05', aqi: 345 },
  ],
  mumbai: [
    { date: '2026-06-29', aqi: 120 }, { date: '2026-06-30', aqi: 135 },
    { date: '2026-07-01', aqi: 155 }, { date: '2026-07-02', aqi: 142 },
    { date: '2026-07-03', aqi: 130 }, { date: '2026-07-04', aqi: 148 },
    { date: '2026-07-05', aqi: 142 },
  ],
  bangalore: [
    { date: '2026-06-29', aqi: 48 }, { date: '2026-06-30', aqi: 52 },
    { date: '2026-07-01', aqi: 45 }, { date: '2026-07-02', aqi: 55 },
    { date: '2026-07-03', aqi: 50 }, { date: '2026-07-04', aqi: 58 },
    { date: '2026-07-05', aqi: 55 },
  ],
};

/**
 * Get the latest AI recommendations for a district
 * @param {string} [districtId] - Optional filter by district
 * @returns {Promise<Array>}
 */
export async function getLatestRecommendations(districtId) {
  try {
    const incidents = window.__municipality_incidents || [];
    const response = await fetch(`/api/recommendations/${districtId || 'delhi'}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ incidents })
    });
    if (response.ok) {
      const resJson = await response.json();
      if (resJson && resJson.success && resJson.data) {
        return [resJson.data];
      }
    }
  } catch (err) {
    console.warn('[Analytics] Express API getLatestRecommendations failed, using Firestore or Demo fallbacks:', err.message);
  }

  if (!isFirebaseAvailable()) {
    if (districtId) {
      return DEMO_RECOMMENDATIONS.filter(r => r.districtId === districtId);
    }
    return DEMO_RECOMMENDATIONS;
  }

  try {
    const db = await getDb();
    const { collection, query, where, orderBy, limit, getDocs } = await import('https://www.gstatic.com/firebasejs/11.6.0/firebase-firestore.js');

    let q;
    if (districtId) {
      q = query(
        collection(db, COLLECTIONS.AI_RECOMMENDATIONS),
        where('districtId', '==', districtId),
        orderBy('generatedAt', 'desc'),
        limit(1)
      );
    } else {
      q = query(
        collection(db, COLLECTIONS.AI_RECOMMENDATIONS),
        orderBy('generatedAt', 'desc'),
        limit(5)
      );
    }

    const timeout = new Promise((_, reject) => setTimeout(() => reject(new Error('Firestore Timeout')), 2500));
    const snapshot = await Promise.race([
      getDocs(q),
      timeout
    ]);

    if (snapshot.empty) {
      console.log('[Analytics] No database recommendations found, using demo data fallback');
      if (districtId) {
        return DEMO_RECOMMENDATIONS.filter(r => r.districtId === districtId);
      }
      return DEMO_RECOMMENDATIONS;
    }

    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (err) {
    console.warn('[Analytics] AI Recommendations query failed or timed out, using fallback demo data', err.message);
    if (districtId) {
      return DEMO_RECOMMENDATIONS.filter(r => r.districtId === districtId);
    }
    return DEMO_RECOMMENDATIONS;
  }
}

/**
 * Get AQI trend data for a district
 * @param {string} districtId
 * @param {number} [days=7]
 * @returns {Promise<Array<{ date: string, aqi: number }>>}
 */
export async function getAQITrends(districtId, days = 7) {
  if (!isFirebaseAvailable()) {
    return DEMO_AQI_TRENDS[districtId] || DEMO_AQI_TRENDS.delhi;
  }

  try {
    const db = await getDb();
    const { collection, query, where, orderBy, limit, getDocs } = await import('https://www.gstatic.com/firebasejs/11.6.0/firebase-firestore.js');

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    const q = query(
      collection(db, COLLECTIONS.AQI_DATA),
      where('districtId', '==', districtId),
      where('date', '>=', cutoffDate.toISOString()),
      orderBy('date', 'asc'),
      limit(days)
    );

    const timeout = new Promise((_, reject) => setTimeout(() => reject(new Error('Firestore Timeout')), 2500));
    const snapshot = await Promise.race([
      getDocs(q),
      timeout
    ]);

    if (snapshot.empty) {
      return DEMO_AQI_TRENDS[districtId] || DEMO_AQI_TRENDS.delhi;
    }

    return snapshot.docs.map(doc => doc.data());
  } catch (err) {
    console.warn('[Analytics] AQI Trends query failed or timed out, using fallback demo data', err.message);
    return DEMO_AQI_TRENDS[districtId] || DEMO_AQI_TRENDS.delhi;
  }
}

/**
 * Request a fresh Gemini analysis via server API
 * @param {string} districtId
 */
export async function requestFreshAnalysis(districtId) {
  const incidents = window.__municipality_incidents || [];
  const waqiAqiVal = parseInt(document.getElementById('muni-kpi-waqi')?.textContent) || 345;
  try {
    const response = await fetch(`/api/recommendations/${districtId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ 
        incidents,
        weather: {
          aqi: waqiAqiVal,
          windSpeed: 12,
          windDirection: 'North-East',
          temp: 28
        }
      })
    });
    if (!response.ok) throw new Error('Failed to generate analysis');
    return response.json();
  } catch (err) {
    console.warn('[Analytics] requestFreshAnalysis failed, falling back to mock:', err.message);
    const mockData = DEMO_RECOMMENDATIONS.find(r => r.districtId === districtId) || DEMO_RECOMMENDATIONS[0];
    // Return formatted success response with mock data
    return {
      success: true,
      data: mockData
    };
  }
}

// ── Priority Colors ──
const PRIORITY_STYLES = {
  critical: { bg: 'bg-error/10', border: 'border-error/30', text: 'text-error', badge: 'bg-error text-on-error' },
  high:     { bg: 'bg-tertiary-fixed-dim/15', border: 'border-tertiary-fixed-dim/30', text: 'text-on-tertiary-container', badge: 'bg-tertiary-fixed-dim text-on-tertiary-fixed' },
  medium:   { bg: 'bg-primary-fixed/20', border: 'border-primary-fixed-dim/30', text: 'text-on-primary-fixed', badge: 'bg-primary-fixed-dim text-on-primary-fixed' },
  info:     { bg: 'bg-secondary/5', border: 'border-secondary/20', text: 'text-secondary', badge: 'bg-secondary-container text-on-secondary-container' },
};

/**
 * Render AI recommendations panel for municipality dashboard
 * @param {string} containerId
 * @param {string} [districtId]
 * @param {object} [preloadedData] - Pre-fetched recommendation data
 */
export async function renderRecommendationsPanel(containerId, districtId, preloadedData = null) {
  const container = document.getElementById(containerId);
  if (!container) return;

  const rec = preloadedData || (await getLatestRecommendations(districtId))[0];

  if (!rec) {
    container.innerHTML = `
      <div class="text-center py-8 text-on-surface-variant">
        <span class="material-symbols-outlined text-4xl mb-2 block">smart_toy</span>
        <p class="text-body-sm">No AI recommendations available yet.</p>
      </div>
    `;
    return;
  }

  const genTime = new Date(rec.generatedAt).toLocaleString('en-IN', {
    day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'
  });

  container.innerHTML = `
    <div class="space-y-4">
      <!-- Header -->
      <div class="flex items-center justify-between">
        <div>
          <h3 class="font-headline-sm text-headline-sm text-on-surface flex items-center gap-2">
            <span class="material-symbols-outlined text-secondary">smart_toy</span>
            AI Action Insights
          </h3>
          <p class="text-[11px] text-on-surface-variant mt-0.5">
            ${rec.districtName || 'District'} · Generated ${genTime}
          </p>
        </div>
        <button id="refresh-ai-btn" class="p-2 rounded-lg hover:bg-surface-container-high transition-colors" title="Refresh Analysis">
          <span class="material-symbols-outlined text-on-surface-variant text-[20px]">refresh</span>
        </button>
      </div>

      <!-- Context summary -->
      <div class="flex gap-2 text-[11px]">
        <span class="px-2 py-1 bg-surface-container-high rounded-full text-on-surface-variant">
          ${rec.dataContext?.hotspotCount || 8} hotspots
        </span>
        <span class="px-2 py-1 bg-surface-container-high rounded-full text-on-surface-variant">
          Avg AQI: ${rec.dataContext?.avgAQI || 200}
        </span>
        <span class="px-2 py-1 bg-surface-container-high rounded-full text-on-surface-variant">
          Peak: ${rec.dataContext?.peakHours ? rec.dataContext.peakHours[0] : '8:00-10:00'}
        </span>
      </div>

      <!-- Recommendation cards -->
      ${rec.recommendations.map((item, idx) => {
        const style = PRIORITY_STYLES[item.priority] || PRIORITY_STYLES.info;
        const isCitizenCleanup = item.icon === 'volunteer_activism' || item.title.toLowerCase().includes('cleanup');
        return `
          <div class="p-3 rounded-xl border ${style.border} ${style.bg} transition-all hover:shadow-sm">
            <div class="flex items-start gap-3">
              <div class="w-8 h-8 rounded-lg bg-white/70 flex items-center justify-center flex-shrink-0 mt-0.5">
                <span class="material-symbols-outlined ${style.text} text-[18px]">${item.icon}</span>
              </div>
              <div class="flex-1 min-w-0">
                <div class="flex items-center gap-2 mb-1">
                  <span class="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase ${style.badge}">${item.priority}</span>
                  <h4 class="font-label-md text-label-md text-on-surface truncate">${item.title}</h4>
                </div>
                <p class="text-[11px] text-on-surface-variant leading-relaxed mb-2">${item.description}</p>
                <div class="flex items-center gap-1 text-[10px] ${style.text} mb-2">
                  <span class="material-symbols-outlined text-[12px]">trending_up</span>
                  ${item.impact}
                </div>
                ${isCitizenCleanup ? `
                  <button data-idx="${idx}" class="approve-rec-btn px-3 py-1 bg-primary text-white hover:bg-primary-hover text-[10px] font-bold rounded-btn transition-colors flex items-center gap-1 shadow-sm mt-1.5">
                    <span class="material-symbols-outlined text-[12px]">thumb_up</span> Approve Recommendation
                  </button>
                ` : ''}
                ${(!isCitizenCleanup && (item.title.toLowerCase().includes('emission') || item.title.toLowerCase().includes('dust') || item.title.toLowerCase().includes('illegal') || item.description.toLowerCase().includes('violat') || item.description.toLowerCase().includes('factor') || item.description.toLowerCase().includes('burn') || item.title.toLowerCase().includes('sprinkl') || item.title.toLowerCase().includes('complian') || item.title.toLowerCase().includes('smog'))) ? `
                  <button data-idx="${idx}" class="generate-notice-btn px-3 py-1 bg-amber-600 hover:bg-amber-700 text-white text-[10px] font-bold rounded-btn transition-colors flex items-center gap-1 shadow-sm mt-1.5">
                    <span class="material-symbols-outlined text-[12px]">description</span> Generate Legal Notice
                  </button>
                ` : ''}
              </div>
            </div>
          </div>
        `;
      }).join('')}
    </div>
  `;

  // Refresh button handler
  document.getElementById('refresh-ai-btn')?.addEventListener('click', async () => {
    container.innerHTML = `
      <div class="flex items-center justify-center py-8 gap-3 text-on-surface-variant">
        <span class="material-symbols-outlined animate-spin">progress_activity</span>
        <span class="text-body-sm">Generating AI insights...</span>
      </div>
    `;
    try {
      const res = await requestFreshAnalysis(districtId || 'delhi');
      if (res && res.success && res.data) {
        await renderRecommendationsPanel(containerId, districtId, res.data);
        window.__aerostreet?.showToast?.('AI Insights refreshed using Gemini!', 'success');
      } else {
        await renderRecommendationsPanel(containerId, districtId);
      }
    } catch (err) {
      console.error(err);
      container.innerHTML = `<div class="text-center py-4 text-error text-body-sm">Failed to refresh: ${err.message}</div>`;
    }
  });

  // Wire up Approve Recommendation buttons
  container.querySelectorAll('.approve-rec-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const idx = parseInt(btn.dataset.idx);
      const item = rec.recommendations[idx];
      showApproveRecommendationForm(item);
    });
  });

  // Wire up Generate Legal Notice buttons
  container.querySelectorAll('.generate-notice-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const idx = parseInt(btn.dataset.idx);
      const item = rec.recommendations[idx];
      await generateLegalNoticeDoc(item.title + ": " + item.description);
    });
  });
}

/**
 * Request warning notice drafting from Gemini backend
 */
async function generateLegalNoticeDoc(description) {
  window.__aerostreet?.showToast?.('Generating warning notice via Gemini...', 'info');
  
  try {
    const response = await fetch('/api/generate-legal-notice', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ incident: description })
    });
    
    if (!response.ok) throw new Error('API request failed');
    const result = await response.json();
    
    if (result.success && result.notice) {
      openDocumentModal(result.notice);
    }
  } catch(err) {
    console.error(err);
    window.__aerostreet?.showToast?.('Failed to draft legal notice. Try again.', 'error');
  }
}

/**
 * Display ready-to-print notice document modal overlay
 */
function openDocumentModal(content) {
  const existing = document.getElementById('notice-document-overlay');
  if (existing) existing.remove();
  
  const overlay = document.createElement('div');
  overlay.id = 'notice-document-overlay';
  overlay.className = 'fixed inset-0 z-[120] flex items-center justify-center bg-black/50 backdrop-blur-sm';
  overlay.innerHTML = `
    <div class="bg-white rounded-card shadow-2xl border border-slate-300 w-full max-w-2xl mx-4 overflow-hidden flex flex-col max-h-[90vh] animate-[fadeIn_0.2s_ease-out] font-sans text-slate-700">
      <!-- Header -->
      <div class="p-6 pb-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between flex-shrink-0">
        <div class="flex items-center gap-2.5">
          <span class="material-symbols-outlined text-amber-600">gavel</span>
          <div>
            <h3 class="text-base font-bold text-slate-900">Official Warning Notice</h3>
            <p class="text-[10px] text-slate-400">Gemini AI Auto-Generated Document</p>
          </div>
        </div>
        <button id="notice-close-btn" class="w-8 h-8 rounded-full hover:bg-slate-200 flex items-center justify-center transition-colors">
          <span class="material-symbols-outlined text-slate-500 text-[18px]">close</span>
        </button>
      </div>
      
      <!-- Letter Content -->
      <div class="p-8 overflow-y-auto bg-stone-50/50 flex-grow font-serif text-sm leading-relaxed text-slate-800 whitespace-pre-wrap select-text border-b border-slate-100" id="print-notice-content">
        ${content}
      </div>
      
      <!-- Footer actions -->
      <div class="p-4 bg-white flex justify-end gap-3 flex-shrink-0">
        <button id="print-notice-btn" class="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-bold transition-all shadow flex items-center gap-1.5">
          <span class="material-symbols-outlined text-[16px]">print</span>
          Print / Save PDF
        </button>
      </div>
    </div>
  `;
  
  document.body.appendChild(overlay);
  
  overlay.querySelector('#notice-close-btn').addEventListener('click', () => overlay.remove());
  overlay.querySelector('#print-notice-btn').addEventListener('click', () => {
    const printWin = window.open('', '_blank');
    printWin.document.write(`
      <html>
      <head>
        <title>AeroStreet-AI Warning Notice</title>
        <style>
          body { font-family: serif; padding: 40px; color: #1e293b; line-height: 1.6; font-size: 14px; }
          .header { text-align: center; margin-bottom: 30px; font-family: sans-serif; font-size: 20px; font-weight: bold; border-bottom: 2px solid #1e293b; padding-bottom: 15px; }
        </style>
      </head>
      <body>
        <div class="header">MUNICIPAL COMMAND CONTROL CENTER - WARNING NOTICE</div>
        <div style="white-space: pre-wrap;">${content}</div>
      </body>
      </html>
    `);
    printWin.document.close();
    printWin.print();
  });
}

/**
 * Open a sleek form modal to approve and launch an AI-recommended cleanup drive
 */
function showApproveRecommendationForm(item) {
  const existing = document.getElementById('approve-rec-modal-overlay');
  if (existing) existing.remove();

  const overlay = document.createElement('div');
  overlay.id = 'approve-rec-modal-overlay';
  overlay.className = 'fixed inset-0 z-[110] flex items-center justify-center bg-black/40 backdrop-blur-sm';
  overlay.innerHTML = `
    <div class="bg-white rounded-card shadow-2xl border border-slate-200 w-full max-w-md mx-4 overflow-hidden animate-[fadeIn_0.2s_ease-out] font-sans text-slate-700">
      <!-- Header -->
      <div class="p-6 pb-4 border-b border-slate-100 bg-gradient-to-r from-blue-50/10 to-transparent">
        <div class="flex items-center justify-between">
          <div>
            <h3 class="text-base font-bold text-slate-900">Approve AI Drive Proposal</h3>
            <p class="text-[11px] text-slate-400">Initialize a new community clean-up drive</p>
          </div>
          <button id="approve-rec-close-btn" class="w-8 h-8 rounded-full hover:bg-slate-100 flex items-center justify-center transition-colors">
            <span class="material-symbols-outlined text-slate-500 text-[18px]">close</span>
          </button>
        </div>
      </div>
      
      <!-- Form Body -->
      <form id="approve-rec-form" class="p-6 space-y-4">
        <div>
          <label class="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Drive Title</label>
          <input type="text" id="rec-form-title" class="w-full px-3 py-2 border border-slate-200 rounded-btn text-xs focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary bg-slate-50/50" value="Yamuna Ghat Cleanup Part 2" required />
        </div>
        <div>
          <label class="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Description</label>
          <textarea id="rec-form-desc" rows="3" class="w-full px-3 py-2 border border-slate-200 rounded-btn text-xs focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary bg-slate-50/50 resize-none" required>Community cleanup campaign at Yamuna Ghat to clear illegal waste dumping hotspots, recommended by Gemini AI.</textarea>
        </div>
        <div class="grid grid-cols-2 gap-4">
          <div>
            <label class="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Date & Time</label>
            <input type="datetime-local" id="rec-form-date" class="w-full px-3 py-2 border border-slate-200 rounded-btn text-xs focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary bg-slate-50/50" value="2026-07-19T09:00" required />
          </div>
          <div>
            <label class="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Max Capacity</label>
            <input type="number" id="rec-form-capacity" class="w-full px-3 py-2 border border-slate-200 rounded-btn text-xs focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary bg-slate-50/50" value="50" min="10" required />
          </div>
        </div>
        <div>
          <label class="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Location</label>
          <input type="text" id="rec-form-location" class="w-full px-3 py-2 border border-slate-200 rounded-btn text-xs focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary bg-slate-50/50" value="Yamuna Ghat, Delhi" required />
        </div>
        
        <div class="pt-2 flex items-center justify-end gap-3">
          <button type="button" id="rec-form-cancel-btn" class="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 rounded-btn transition-colors">Cancel</button>
          <button type="submit" class="px-4 py-2 bg-primary hover:bg-primary-hover text-white text-xs font-bold rounded-btn shadow-md transition-colors flex items-center gap-1.5">
            <span class="material-symbols-outlined text-[14px]">rocket_launch</span> Launch Drive
          </button>
        </div>
      </form>
    </div>
  `;

  document.body.appendChild(overlay);

  const close = () => overlay.remove();
  document.getElementById('approve-rec-close-btn').addEventListener('click', close);
  document.getElementById('rec-form-cancel-btn').addEventListener('click', close);
  overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });

  document.getElementById('approve-rec-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const title = document.getElementById('rec-form-title').value;
    const description = document.getElementById('rec-form-desc').value;
    const dateVal = document.getElementById('rec-form-date').value;
    const maxSlots = parseInt(document.getElementById('rec-form-capacity').value);
    const location = document.getElementById('rec-form-location').value;

    const eventData = {
      title,
      description,
      date: new Date(dateVal).toISOString(),
      location,
      maxSlots,
      coordinates: { lat: 28.6328, lng: 77.2197 },
      createdBy: 'Municipality AI System',
      category: 'cleanup'
    };

    try {
      const { createEvent } = await import('./community.js');
      await createEvent(eventData);
      window.__aerostreet?.showToast?.('Custom Clean-up Drive created! 🚀', 'success');
      close();
      
      // Open the Community modal to reveal the newly added card
      setTimeout(() => {
        const link = document.getElementById('nav-community-link');
        if (link) {
          link.click();
        } else {
          const panel = document.getElementById('community-panel');
          if (panel) {
            import('./community.js').then(m => m.renderCommunityPanel('community-panel'));
          }
        }
      }, 500);

    } catch (err) {
      window.__aerostreet?.showToast?.(err.message, 'error');
    }
  });
}

/**
 * Render AQI trend chart (simple SVG sparkline)
 * @param {string} containerId
 * @param {string} districtId
 */
export async function renderTrendChart(containerId, districtId) {
  const container = document.getElementById(containerId);
  if (!container) return;

  const data = await getAQITrends(districtId || 'delhi');
  if (data.length === 0) return;

  const width = 280;
  const height = 80;
  const padding = 4;
  const maxAQI = Math.max(...data.map(d => d.aqi));
  const minAQI = Math.min(...data.map(d => d.aqi));
  const range = maxAQI - minAQI || 1;

  const points = data.map((d, i) => {
    const x = padding + (i / (data.length - 1)) * (width - padding * 2);
    const y = padding + ((maxAQI - d.aqi) / range) * (height - padding * 2);
    return `${x},${y}`;
  });

  const lastPoint = data[data.length - 1];
  const level = getAQILevel(lastPoint.aqi);

  container.innerHTML = `
    <div class="mb-2 flex items-center justify-between">
      <span class="font-label-md text-label-md text-on-surface-variant">7-Day AQI Trend</span>
      <span class="text-body-sm font-semibold" style="color: ${level.color}">${lastPoint.aqi}</span>
    </div>
    <svg width="100%" height="${height}" viewBox="0 0 ${width} ${height}" class="overflow-visible">
      <defs>
        <linearGradient id="trendGradient" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="${level.color}" stop-opacity="0.2"/>
          <stop offset="100%" stop-color="${level.color}" stop-opacity="0"/>
        </linearGradient>
      </defs>
      <!-- Area fill -->
      <polygon points="${padding},${height - padding} ${points.join(' ')} ${width - padding},${height - padding}"
        fill="url(#trendGradient)" />
      <!-- Line -->
      <polyline points="${points.join(' ')}"
        fill="none" stroke="${level.color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
      <!-- End dot -->
      <circle cx="${points[points.length - 1].split(',')[0]}" cy="${points[points.length - 1].split(',')[1]}"
        r="3" fill="${level.color}" stroke="white" stroke-width="2" />
    </svg>
    <div class="flex justify-between text-[10px] text-on-surface-variant mt-1">
      ${data.map(d => `<span>${new Date(d.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }).split(' ')[0]}</span>`).join('')}
    </div>
  `;
}
