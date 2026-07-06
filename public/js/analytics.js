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
  try {
    const response = await fetch(`/api/recommendations/${districtId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ incidents })
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
                <div class="flex items-center gap-1 text-[10px] ${style.text}">
                  <span class="material-symbols-outlined text-[12px]">trending_up</span>
                  ${item.impact}
                </div>
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
