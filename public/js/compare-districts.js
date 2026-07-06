// ============================================
// AeroStreet AI — District Comparison Tool
// ============================================

import { getAQILevel } from './config.js';

const ALL_DISTRICTS = [
  { id: 'delhi', name: 'Delhi', state: 'Delhi NCT', aqi: 342, pm25: 250, pm10: 380 },
  { id: 'gurugram', name: 'Gurugram', state: 'Haryana', aqi: 290, pm25: 195, pm10: 280 },
  { id: 'aizawl', name: 'Aizawl', state: 'Mizoram', aqi: 22, pm25: 12, pm10: 25 },
  { id: 'kolkata', name: 'Kolkata', state: 'West Bengal', aqi: 178, pm25: 98, pm10: 165 },
  { id: 'howrah', name: 'Howrah', state: 'West Bengal', aqi: 190, pm25: 110, pm10: 180 },
  { id: 'hooghly', name: 'Hooghly', state: 'West Bengal', aqi: 145, pm25: 68, pm10: 120 },
  { id: 'darjeeling', name: 'Darjeeling', state: 'West Bengal', aqi: 65, pm25: 35, pm10: 60 },
  { id: 'n24pgs', name: 'North 24 Parganas', state: 'West Bengal', aqi: 160, pm25: 85, pm10: 145 },
  { id: 'bangalore', name: 'Bengaluru Urban', state: 'Karnataka', aqi: 55, pm25: 30, pm10: 48 },
  { id: 'mysuru', name: 'Mysuru', state: 'Karnataka', aqi: 38, pm25: 18, pm10: 35 },
  { id: 'mangaluru', name: 'Dakshina Kannada', state: 'Karnataka', aqi: 41, pm25: 20, pm10: 38 },
  { id: 'mumbai', name: 'Mumbai City', state: 'Maharashtra', aqi: 142, pm25: 65, pm10: 110 },
  { id: 'pune', name: 'Pune', state: 'Maharashtra', aqi: 112, pm25: 55, pm10: 95 },
  { id: 'nagpur', name: 'Nagpur', state: 'Maharashtra', aqi: 98, pm25: 45, pm10: 80 }
];

export function showComparisonModal() {
  const existing = document.getElementById('compare-modal-overlay');
  if (existing) existing.remove();

  const overlay = document.createElement('div');
  overlay.id = 'compare-modal-overlay';
  overlay.className = 'fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm';
  overlay.innerHTML = `
    <div class="bg-white rounded-card shadow-2xl border border-slate-200 w-full max-w-xl mx-4 overflow-hidden animate-[fadeIn_0.2s_ease-out]">
      <!-- Header -->
      <div class="p-6 pb-4 border-b border-slate-100 bg-gradient-to-r from-blue-50/10 to-transparent">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center text-primary">
              <span class="material-symbols-outlined">compare_arrows</span>
            </div>
            <div>
              <h2 class="text-base font-bold text-slate-800">Compare Regional Air Quality</h2>
              <p class="text-[10px] text-slate-400">Select two regions for a side-by-side analysis</p>
            </div>
          </div>
          <button id="compare-close-btn" class="w-8 h-8 rounded-full hover:bg-slate-100 flex items-center justify-center transition-colors">
            <span class="material-symbols-outlined text-slate-500">close</span>
          </button>
        </div>
      </div>
      
      <!-- Selection panel -->
      <div class="p-6 space-y-6">
        <div class="grid grid-cols-2 gap-4">
          <div>
            <label class="block text-[10px] font-bold text-slate-400 mb-1 uppercase tracking-wider">Region A</label>
            <select id="compare-select-a" class="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white text-slate-800 text-xs focus:border-primary outline-none">
              ${ALL_DISTRICTS.map(d => `<option value="${d.id}" ${d.id === 'delhi' ? 'selected' : ''}>${d.name} (${d.state})</option>`).join('')}
            </select>
          </div>
          <div>
            <label class="block text-[10px] font-bold text-slate-400 mb-1 uppercase tracking-wider">Region B</label>
            <select id="compare-select-b" class="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white text-slate-800 text-xs focus:border-primary outline-none">
              ${ALL_DISTRICTS.map(d => `<option value="${d.id}" ${d.id === 'mumbai' ? 'selected' : ''}>${d.name} (${d.state})</option>`).join('')}
            </select>
          </div>
        </div>

        <!-- Comparison Chart Area -->
        <div id="comparison-results" class="space-y-4 pt-2 border-t border-slate-100">
          <!-- Populated dynamically -->
        </div>
      </div>
    </div>
  `;

  document.body.appendChild(overlay);

  // Close handlers
  document.getElementById('compare-close-btn').addEventListener('click', () => overlay.remove());
  overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });

  // Update on change
  const selectA = document.getElementById('compare-select-a');
  const selectB = document.getElementById('compare-select-b');

  const updateComparison = () => {
    const distA = ALL_DISTRICTS.find(d => d.id === selectA.value);
    const distB = ALL_DISTRICTS.find(d => d.id === selectB.value);
    if (!distA || !distB) return;

    renderComparisonBars(distA, distB);
  };

  selectA.addEventListener('change', updateComparison);
  selectB.addEventListener('change', updateComparison);

  // Initial draw
  updateComparison();
}

function renderComparisonBars(distA, distB) {
  const container = document.getElementById('comparison-results');
  if (!container) return;

  const lvlA = getAQILevel(distA.aqi);
  const lvlB = getAQILevel(distB.aqi);

  // Compare diff
  const diff = Math.abs(distA.aqi - distB.aqi);
  const pct = Math.round((diff / Math.min(distA.aqi, distB.aqi)) * 100);
  const cleaner = distA.aqi < distB.aqi ? distA.name : distB.name;
  const polluted = distA.aqi > distB.aqi ? distA.name : distB.name;

  let comparisonText = `${cleaner} is cleaner than ${polluted}.`;
  if (diff > 0) {
    comparisonText = `<strong>${polluted}</strong> is <strong>${pct}%</strong> more polluted than <strong>${cleaner}</strong> (AQI difference of ${diff} points).`;
  } else {
    comparisonText = `Both regions share the same air quality index level.`;
  }

  container.innerHTML = `
    <!-- Summary Statement Card -->
    <div class="p-3 bg-blue-50/50 border border-blue-100 rounded-lg text-xs text-slate-700 leading-relaxed">
      <span class="material-symbols-outlined text-primary text-sm align-middle mr-1">info</span>
      ${comparisonText}
    </div>

    <!-- Metrics comparisons -->
    <div class="space-y-4 pt-2">
      <!-- 1. AQI Compare -->
      <div>
        <div class="flex justify-between text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1">
          <span>Overall AQI</span>
          <span>Max: 500</span>
        </div>
        <div class="space-y-2">
          <!-- District A -->
          <div>
            <div class="flex justify-between text-xs mb-0.5">
              <span class="font-semibold text-slate-700">${distA.name}</span>
              <span class="font-bold font-mono" style="color: ${lvlA.color}">${distA.aqi} (${lvlA.label})</span>
            </div>
            <div class="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
              <div class="h-full rounded-full transition-all duration-500" style="background-color: ${lvlA.color}; width: ${Math.min(100, (distA.aqi / 500) * 100)}%"></div>
            </div>
          </div>
          <!-- District B -->
          <div>
            <div class="flex justify-between text-xs mb-0.5">
              <span class="font-semibold text-slate-700">${distB.name}</span>
              <span class="font-bold font-mono" style="color: ${lvlB.color}">${distB.aqi} (${lvlB.label})</span>
            </div>
            <div class="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
              <div class="h-full rounded-full transition-all duration-500" style="background-color: ${lvlB.color}; width: ${Math.min(100, (distB.aqi / 500) * 100)}%"></div>
            </div>
          </div>
        </div>
      </div>

      <!-- 2. PM2.5 Compare -->
      <div>
        <div class="flex justify-between text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1">
          <span>PM2.5 Concentration</span>
          <span>Max: 300 µg/m³</span>
        </div>
        <div class="space-y-2">
          <!-- District A -->
          <div>
            <div class="flex justify-between text-xs mb-0.5">
              <span class="font-semibold text-slate-700">${distA.name}</span>
              <span class="font-bold font-mono text-slate-600">${distA.pm25} µg/m³</span>
            </div>
            <div class="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
              <div class="h-full bg-blue-600 rounded-full transition-all duration-500" style="width: ${Math.min(100, (distA.pm25 / 300) * 100)}%"></div>
            </div>
          </div>
          <!-- District B -->
          <div>
            <div class="flex justify-between text-xs mb-0.5">
              <span class="font-semibold text-slate-700">${distB.name}</span>
              <span class="font-bold font-mono text-slate-600">${distB.pm25} µg/m³</span>
            </div>
            <div class="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
              <div class="h-full bg-blue-600 rounded-full transition-all duration-500" style="width: ${Math.min(100, (distB.pm25 / 300) * 100)}%"></div>
            </div>
          </div>
        </div>
      </div>

      <!-- 3. PM10 Compare -->
      <div>
        <div class="flex justify-between text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1">
          <span>PM10 Concentration</span>
          <span>Max: 400 µg/m³</span>
        </div>
        <div class="space-y-2">
          <!-- District A -->
          <div>
            <div class="flex justify-between text-xs mb-0.5">
              <span class="font-semibold text-slate-700">${distA.name}</span>
              <span class="font-bold font-mono text-slate-600">${distA.pm10} µg/m³</span>
            </div>
            <div class="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
              <div class="h-full bg-slate-400 rounded-full transition-all duration-500" style="width: ${Math.min(100, (distA.pm10 / 400) * 100)}%"></div>
            </div>
          </div>
          <!-- District B -->
          <div>
            <div class="flex justify-between text-xs mb-0.5">
              <span class="font-semibold text-slate-700">${distB.name}</span>
              <span class="font-bold font-mono text-slate-600">${distB.pm10} µg/m³</span>
            </div>
            <div class="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
              <div class="h-full bg-slate-400 rounded-full transition-all duration-500" style="width: ${Math.min(100, (distB.pm10 / 400) * 100)}%"></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;
}
