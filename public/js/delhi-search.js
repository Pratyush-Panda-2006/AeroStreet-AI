// ============================================
// AeroStreet-AI — Delhi NCR Place Search
// ============================================
// Autocomplete-powered place search restricted to Delhi/NCR.
// Reuses the existing fetchEnvironmentData() pipeline.

const DELHI_NCR_BOUNDS = {
  lat: { min: 28.0, max: 29.2 },
  lng: { min: 76.5, max: 78.0 }
};

const NCR_KEYWORDS = [
  'delhi', 'new delhi', 'north delhi', 'south delhi', 'east delhi',
  'west delhi', 'central delhi', 'rohini', 'dwarka', 'saket',
  'noida', 'greater noida', 'ghaziabad', 'gurugram', 'gurgaon',
  'faridabad', 'haryana', 'uttar pradesh', 'gautam budh nagar'
];

const RECENT_KEY = 'aerostreet_recent_locations';
const MAX_RECENT = 5;
const DEBOUNCE_MS = 400;
const MIN_QUERY_LENGTH = 2;

let debounceTimer = null;
let abortController = null;
let suggestions = [];
let highlightIndex = -1;
let searchCache = {};
let locationSource = 'auto'; // 'auto' | 'search'

// ── Initialization ──
export function initDelhiSearch() {
  const searchContainer = document.getElementById('delhi-search-container');
  if (!searchContainer) return;

  const input = document.getElementById('delhi-search-input');
  const dropdown = document.getElementById('delhi-search-dropdown');
  const clearBtn = document.getElementById('delhi-search-clear');

  if (!input || !dropdown) return;

  // Input events
  input.addEventListener('input', (e) => {
    const q = e.target.value.trim();
    if (clearBtn) clearBtn.classList.toggle('hidden', q.length === 0);
    if (q.length < MIN_QUERY_LENGTH) {
      hideDropdown();
      if (q.length === 0) showRecentLocations();
      return;
    }
    debouncedSearch(q);
  });

  // Keyboard navigation
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      hideDropdown();
      input.blur();
      return;
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      highlightIndex = Math.min(highlightIndex + 1, suggestions.length - 1);
      renderHighlight();
      return;
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      highlightIndex = Math.max(highlightIndex - 1, -1);
      renderHighlight();
      return;
    }
    if (e.key === 'Enter') {
      e.preventDefault();
      if (highlightIndex >= 0 && highlightIndex < suggestions.length) {
        selectSuggestion(suggestions[highlightIndex]);
      } else if (suggestions.length > 0) {
        selectSuggestion(suggestions[0]);
      }
    }
  });

  // Focus → show recent
  input.addEventListener('focus', () => {
    if (input.value.trim().length === 0) {
      showRecentLocations();
    }
  });

  // Clear button
  if (clearBtn) {
    clearBtn.addEventListener('click', () => {
      input.value = '';
      clearBtn.classList.add('hidden');
      hideDropdown();
      input.focus();
    });
  }

  // Click outside closes dropdown
  document.addEventListener('click', (e) => {
    if (!searchContainer.contains(e.target)) {
      hideDropdown();
    }
  });
}

// ── Debounced Search ──
function debouncedSearch(query) {
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => searchPlaces(query), DEBOUNCE_MS);
}

// ── Nominatim Search (Client-side for autocomplete) ──
async function searchPlaces(query) {
  // Check cache first
  const cacheKey = query.toLowerCase().trim();
  if (searchCache[cacheKey]) {
    suggestions = searchCache[cacheKey];
    highlightIndex = -1;
    renderSuggestions();
    return;
  }

  // Abort previous request
  if (abortController) abortController.abort();
  abortController = new AbortController();

  showSearchingState();

  try {
    // Bias search toward Delhi NCR using viewbox
    const url = `https://nominatim.openstreetmap.org/search?` +
      `q=${encodeURIComponent(query + ', Delhi NCR, India')}` +
      `&format=json&addressdetails=1&limit=6` +
      `&viewbox=${DELHI_NCR_BOUNDS.lng.min},${DELHI_NCR_BOUNDS.lat.max},${DELHI_NCR_BOUNDS.lng.max},${DELHI_NCR_BOUNDS.lat.min}` +
      `&bounded=0`;

    const res = await fetch(url, {
      headers: { 'User-Agent': 'AeroStreet-AI/1.0' },
      signal: abortController.signal
    });

    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();

    // Filter for Delhi NCR region
    const filtered = data.filter(place => isInDelhiNCR(place));
    suggestions = filtered.slice(0, 5).map(formatPlace);

    // Cache results
    searchCache[cacheKey] = suggestions;
    highlightIndex = -1;

    if (suggestions.length === 0) {
      showNoResults(query);
    } else {
      renderSuggestions();
    }
  } catch (err) {
    if (err.name === 'AbortError') return; // Cancelled, ignore
    console.warn('Search error:', err);
    showSearchError();
  }
}

// ── Delhi NCR Validation ──
function isInDelhiNCR(place) {
  const lat = parseFloat(place.lat);
  const lon = parseFloat(place.lon);
  const addr = place.address || {};

  // Check address keywords
  const addressStr = [
    addr.city, addr.town, addr.state, addr.state_district,
    addr.county, addr.suburb, addr.village, place.display_name
  ].filter(Boolean).join(' ').toLowerCase();

  const hasNCRKeyword = NCR_KEYWORDS.some(kw => addressStr.includes(kw));

  // Check geographic bounds (generous NCR region)
  const inBounds = lat >= DELHI_NCR_BOUNDS.lat.min && lat <= DELHI_NCR_BOUNDS.lat.max &&
                   lon >= DELHI_NCR_BOUNDS.lng.min && lon <= DELHI_NCR_BOUNDS.lng.max;

  return hasNCRKeyword || inBounds;
}

// ── Format Place Object ──
function formatPlace(place) {
  const addr = place.address || {};
  const name = place.name || addr.suburb || addr.neighbourhood || addr.road || 'Unknown';
  const area = addr.suburb || addr.neighbourhood || addr.city_district || '';
  const city = addr.city || addr.town || addr.state_district || 'Delhi';
  const state = addr.state || '';

  // Build a clean subtitle
  const parts = [area, city, state].filter(Boolean);
  const unique = [...new Set(parts)];
  const subtitle = unique.join(', ');

  return {
    name: name,
    subtitle: subtitle || 'Delhi NCR, India',
    lat: parseFloat(place.lat),
    lng: parseFloat(place.lon),
    displayName: place.display_name
  };
}

// ── Select a Suggestion ──
export function selectSuggestion(place) {
  const input = document.getElementById('delhi-search-input');
  if (input) input.value = place.name;

  hideDropdown();
  saveRecentLocation(place);
  locationSource = 'search';

  // Update the location source label
  updateLocationSourceLabel(place.name);

  // Dispatch a custom event for forecast-simulator to handle
  window.dispatchEvent(new CustomEvent('delhiSearchSelected', {
    detail: { lat: place.lat, lng: place.lng, name: place.name, subtitle: place.subtitle }
  }));
}

// ── Render Suggestions Dropdown ──
function renderSuggestions() {
  const dropdown = document.getElementById('delhi-search-dropdown');
  if (!dropdown) return;

  dropdown.innerHTML = suggestions.map((s, i) => `
    <button class="delhi-suggestion w-full text-left px-4 py-3 hover:bg-blue-50 transition-colors flex items-start gap-3 border-b border-slate-100 last:border-0 ${i === highlightIndex ? 'bg-blue-50' : ''}"
            data-index="${i}" type="button">
      <span class="material-symbols-outlined text-primary text-[18px] mt-0.5 shrink-0">location_on</span>
      <div class="min-w-0">
        <p class="text-sm font-bold text-slate-800 truncate">${escapeHtml(s.name)}</p>
        <p class="text-xs text-slate-500 truncate">${escapeHtml(s.subtitle)}</p>
      </div>
    </button>
  `).join('');

  // Attach click handlers
  dropdown.querySelectorAll('.delhi-suggestion').forEach(btn => {
    btn.addEventListener('click', () => {
      const idx = parseInt(btn.dataset.index);
      selectSuggestion(suggestions[idx]);
    });
  });

  dropdown.classList.remove('hidden');
}

function renderHighlight() {
  const items = document.querySelectorAll('.delhi-suggestion');
  items.forEach((el, i) => {
    el.classList.toggle('bg-blue-50', i === highlightIndex);
  });
}

// ── Recent Locations ──
function getRecentLocations() {
  try {
    return JSON.parse(localStorage.getItem(RECENT_KEY) || '[]');
  } catch { return []; }
}

function saveRecentLocation(place) {
  const recent = getRecentLocations().filter(r => r.name !== place.name);
  recent.unshift({ name: place.name, subtitle: place.subtitle, lat: place.lat, lng: place.lng });
  localStorage.setItem(RECENT_KEY, JSON.stringify(recent.slice(0, MAX_RECENT)));
}

function showRecentLocations() {
  const recent = getRecentLocations();
  if (recent.length === 0) return;

  const dropdown = document.getElementById('delhi-search-dropdown');
  if (!dropdown) return;

  suggestions = recent;
  highlightIndex = -1;

  dropdown.innerHTML = `
    <div class="px-4 py-2 border-b border-slate-100">
      <p class="text-[10px] font-bold uppercase text-slate-400 tracking-widest">Recent Locations</p>
    </div>
  ` + recent.map((s, i) => `
    <button class="delhi-suggestion w-full text-left px-4 py-2.5 hover:bg-blue-50 transition-colors flex items-start gap-3 border-b border-slate-100 last:border-0"
            data-index="${i}" type="button">
      <span class="material-symbols-outlined text-slate-400 text-[16px] mt-0.5 shrink-0">history</span>
      <div class="min-w-0">
        <p class="text-sm font-semibold text-slate-700 truncate">${escapeHtml(s.name)}</p>
        <p class="text-xs text-slate-400 truncate">${escapeHtml(s.subtitle)}</p>
      </div>
    </button>
  `).join('');

  dropdown.querySelectorAll('.delhi-suggestion').forEach(btn => {
    btn.addEventListener('click', () => {
      const idx = parseInt(btn.dataset.index);
      selectSuggestion(suggestions[idx]);
    });
  });

  dropdown.classList.remove('hidden');
}

// ── Dropdown States ──
function showSearchingState() {
  const dropdown = document.getElementById('delhi-search-dropdown');
  if (!dropdown) return;
  dropdown.innerHTML = `
    <div class="px-4 py-4 flex items-center gap-3 text-slate-500">
      <span class="material-symbols-outlined animate-spin text-[18px]">sync</span>
      <span class="text-sm font-medium">Searching Delhi NCR...</span>
    </div>
  `;
  dropdown.classList.remove('hidden');
}

function showNoResults(query) {
  const dropdown = document.getElementById('delhi-search-dropdown');
  if (!dropdown) return;
  dropdown.innerHTML = `
    <div class="px-4 py-4 text-center">
      <span class="material-symbols-outlined text-slate-300 text-[28px] mb-1">search_off</span>
      <p class="text-sm font-semibold text-slate-600">No results in Delhi NCR</p>
      <p class="text-xs text-slate-400 mt-1">Try searching for a different place or landmark</p>
    </div>
  `;
  dropdown.classList.remove('hidden');
}

function showSearchError() {
  const dropdown = document.getElementById('delhi-search-dropdown');
  if (!dropdown) return;
  dropdown.innerHTML = `
    <div class="px-4 py-4 text-center">
      <span class="material-symbols-outlined text-red-300 text-[28px] mb-1">cloud_off</span>
      <p class="text-sm font-semibold text-slate-600">Search temporarily unavailable</p>
      <p class="text-xs text-slate-400 mt-1">Please try again in a moment</p>
    </div>
  `;
  dropdown.classList.remove('hidden');
}

function hideDropdown() {
  const dropdown = document.getElementById('delhi-search-dropdown');
  if (dropdown) dropdown.classList.add('hidden');
  highlightIndex = -1;
}

// ── Location Source Label ──
function updateLocationSourceLabel(placeName) {
  const label = document.getElementById('location-source-label');
  if (label) {
    label.innerHTML = `<span class="material-symbols-outlined text-[14px]">search</span> Searched Location`;
  }
}

export function setLocationSourceAuto() {
  locationSource = 'auto';
  const label = document.getElementById('location-source-label');
  if (label) {
    label.innerHTML = `<span class="material-symbols-outlined text-[14px]">location_on</span> Your Location`;
  }
}

export function getLocationSource() {
  return locationSource;
}

// ── Helpers ──
function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}
