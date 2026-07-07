// ============================================
// IndianAQI — Main Application Entry Point
// ============================================
// Orchestrates all modules, handles interactive state-to-district
// drill-down map updates, and triggers KPI count-up animations.

import { IS_DEMO_MODE, getAQILevel } from './config.js';
import { initAuth, onAuthChange, getCurrentUser, showAuthModal, signOut } from './auth.js';
import { initMap, registerOnStateChange } from './map.js';
import { showReportModal } from './reports.js';
import { renderCommunityPanel } from './community.js';
import { renderRecommendationsPanel, renderTrendChart } from './analytics.js';

// ── Global namespace for cross-module utilities ──
window.__aerostreet = {
  showToast,
  showReportModal,
  showAuthModal,
};

// ============================================
// Toast Notification System
// ============================================
const TOAST_ICONS = {
  success: 'check_circle',
  error: 'error',
  warning: 'warning',
  info: 'info',
};

const TOAST_COLORS = {
  success: 'bg-green-600 text-white',
  error: 'bg-red-600 text-white',
  warning: 'bg-amber-600 text-white',
  info: 'bg-blue-600 text-white',
};

/**
 * Show a toast notification
 * @param {string} message
 * @param {'success'|'error'|'warning'|'info'} type
 * @param {number} duration
 */
function showToast(message, type = 'info', duration = 4000) {
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    container.className = 'fixed top-20 right-4 z-[200] flex flex-col gap-2 pointer-events-none font-sans';
    document.body.appendChild(container);
  }

  const toast = document.createElement('div');
  toast.className = `pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-lg shadow-xl ${TOAST_COLORS[type]} text-xs font-semibold max-w-sm border border-white/10 animate-[slideIn_0.3s_ease-out] backdrop-blur-sm`;
  toast.innerHTML = `
    <span class="material-symbols-outlined text-[18px]">${TOAST_ICONS[type]}</span>
    <span class="flex-1 leading-normal">${message}</span>
    <button class="opacity-70 hover:opacity-100 transition-opacity" onclick="this.parentElement.remove()">
      <span class="material-symbols-outlined text-[14px]">close</span>
    </button>
  `;

  container.appendChild(toast);
  setTimeout(() => {
    toast.style.transition = 'opacity 0.3s, transform 0.3s';
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(100%)';
    setTimeout(() => toast.remove(), 300);
  }, duration);
}

// ============================================
// Page Detection & Initialization
// ============================================

function detectPage() {
  const path = window.location.pathname.toLowerCase();
  const title = document.title.toLowerCase();

  if (path.includes('forecast') || title.includes('forecast')) return 'forecast';
  if (path.includes('district') || title.includes('district')) return 'district';
  if (path.includes('national') || title.includes('national')) return 'national';
  if (path.includes('municipality') || title.includes('dashboard') || title.includes('municipality')) return 'municipality';

  // Default fallback
  if (path === '/' || path.endsWith('index.html') || path === '') return 'national';
  return 'national';
}

async function initPage() {
  const page = detectPage();
  console.log(`[App] Initializing page: ${page}`);

  wireCommonUI();

  switch (page) {
    case 'district':
      await initDistrictPage();
      break;
    case 'national':
      await initNationalPage();
      break;
    case 'municipality':
      await initMunicipalityPage();
      break;
    case 'forecast':
      console.log('[App] Forecast Page Initialized - skipping map logic');
      break;
  }
}

// ============================================
// Common UI Wiring
// ============================================

function wireCommonUI() {
  // Navigation controls - open reports directly without login requirement!
  document.getElementById('nav-report-btn')?.addEventListener('click', () => {
    showReportModal();
  });

  document.getElementById('hero-report-btn')?.addEventListener('click', () => {
    showReportModal();
  });

  document.getElementById('nav-community-link')?.addEventListener('click', (e) => {
    e.preventDefault();
    showCommunityModal();
  });

  // Hide the dashboard login button by default since the app is free for everyone
  const loginBtn = document.getElementById('nav-login-btn');
  if (loginBtn) {
    loginBtn.style.display = 'none';
  }

  // User profile dropdown menu
  const avatar = document.getElementById('user-avatar');
  if (avatar) {
    avatar.addEventListener('click', () => showUserMenu(avatar));
  }

  // Bind auth state updates
  onAuthChange(updateAuthUI);

  // Trigger animations
  initAnimations();

  // Setup count-up statistics
  initCountUpStats();
}

function updateAuthUI(user) {
  const loginBtn = document.getElementById('nav-login-btn');
  const avatar = document.getElementById('user-avatar');

  // Always hide loginBtn because this app is free for everyone without logging in
  if (loginBtn) {
    loginBtn.style.display = 'none';
  }

  if (user) {
    if (avatar) {
      avatar.classList.remove('hidden');
      avatar.title = `${user.displayName} (${user.role})`;
    }
  } else {
    if (avatar) avatar.classList.add('hidden');
  }
}

function showUserMenu(anchor) {
  const existing = document.getElementById('user-menu');
  if (existing) { existing.remove(); return; }

  const user = getCurrentUser();
  if (!user) return;

  const rect = anchor.getBoundingClientRect();
  const menu = document.createElement('div');
  menu.id = 'user-menu';
  menu.className = 'fixed z-[100] w-56 bg-white rounded-lg shadow-2xl border border-slate-200 overflow-hidden';
  menu.style.top = `${rect.bottom + 8}px`;
  menu.style.right = `${window.innerWidth - rect.right}px`;
  menu.innerHTML = `
    <div class="p-4 border-b border-slate-100 bg-slate-50">
      <p class="font-bold text-slate-800 text-xs">${user.displayName}</p>
      <p class="text-[10px] text-slate-400 font-mono mt-0.5">${user.email}</p>
      <span class="inline-block mt-1 px-2 py-0.5 text-[9px] font-bold rounded-full bg-blue-50 text-primary border border-blue-100">${user.role.toUpperCase()}</span>
    </div>
    <div class="p-2 space-y-1">
      <button id="switch-role-btn" class="w-full text-left px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 hover:text-slate-900 rounded-md transition-colors flex items-center gap-2">
        <span class="material-symbols-outlined text-[16px]">swap_horiz</span>
        Switch View
      </button>
      <button id="sign-out-btn" class="w-full text-left px-3 py-1.5 text-xs text-red-600 hover:bg-red-50 rounded-md transition-colors flex items-center gap-2">
        <span class="material-symbols-outlined text-[16px]">logout</span>
        Sign Out
      </button>
    </div>
  `;

  document.body.appendChild(menu);

  document.getElementById('switch-role-btn').addEventListener('click', async () => {
    const { signIn } = await import('./auth.js');
    const newRole = user.role === 'municipality' ? 'citizen' : 'municipality';
    await signIn(user.email, 'demo', newRole);
    menu.remove();
    showToast(`Switched view mode to: ${newRole}`, 'success');
    setTimeout(() => location.reload(), 500);
  });

  document.getElementById('sign-out-btn').addEventListener('click', async () => {
    await signOut();
    menu.remove();
    showToast('Signed out successfully', 'info');
    setTimeout(() => location.reload(), 500);
  });

  setTimeout(() => {
    document.addEventListener('click', function closeMenu(e) {
      if (!menu.contains(e.target) && e.target !== anchor) {
        menu.remove();
        document.removeEventListener('click', closeMenu);
      }
    });
  }, 100);
}

function showCommunityModal() {
  const existing = document.getElementById('community-modal-overlay');
  if (existing) existing.remove();

  const overlay = document.createElement('div');
  overlay.id = 'community-modal-overlay';
  overlay.className = 'fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm';
  overlay.innerHTML = `
    <div class="bg-white rounded-card shadow-2xl border border-slate-200 w-full max-w-lg mx-4 max-h-[85vh] flex flex-col overflow-hidden animate-[fadeIn_0.2s_ease-out]">
      <div class="p-6 pb-4 border-b border-slate-100 flex items-center justify-between">
        <div>
          <h2 class="text-lg font-bold text-slate-900">Community Drives</h2>
          <p class="text-xs text-slate-400">Join local citizen-led initiatives</p>
        </div>
        <button id="community-close-btn" class="w-8 h-8 rounded-full hover:bg-slate-100 flex items-center justify-center transition-colors">
          <span class="material-symbols-outlined text-slate-500">close</span>
        </button>
      </div>
      <div id="community-events-container" class="p-6 overflow-y-auto flex-1">
        <div class="flex items-center justify-center py-8 gap-2 text-xs text-slate-400">
          <span class="material-symbols-outlined animate-spin text-[16px]">progress_activity</span>
          Loading active schedules...
        </div>
      </div>
    </div>
  `;

  document.body.appendChild(overlay);

  document.getElementById('community-close-btn').addEventListener('click', () => overlay.remove());
  overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });

  renderCommunityPanel('community-events-container');
}

// ============================================
// Interactive SVG Map Sync
// ============================================

let currentSortMode = 'highest';
let lastViewState = null;

// Helper to retrieve/mock districts for state accordion
function getDistrictsForState(state) {
  const wb = [
    { id: 'kolkata', name: 'Kolkata', state: 'West Bengal', aqi: 178 },
    { id: 'howrah', name: 'Howrah', state: 'West Bengal', aqi: 190 },
    { id: 'hooghly', name: 'Hooghly', state: 'West Bengal', aqi: 145 },
    { id: 'darjeeling', name: 'Darjeeling', state: 'West Bengal', aqi: 65 }
  ];
  const ka = [
    { id: 'bangalore', name: 'Bengaluru Urban', state: 'Karnataka', aqi: 55 },
    { id: 'mysore', name: 'Mysuru', state: 'Karnataka', aqi: 48 },
    { id: 'mangalore', name: 'Mangaluru', state: 'Karnataka', aqi: 62 }
  ];
  const mh = [
    { id: 'mumbai', name: 'Mumbai', state: 'Maharashtra', aqi: 124 },
    { id: 'pune', name: 'Pune', state: 'Maharashtra', aqi: 98 },
    { id: 'nagpur', name: 'Nagpur', state: 'Maharashtra', aqi: 110 }
  ];

  if (state.id === 'in-wb') return wb;
  if (state.id === 'in-ka') return ka;
  if (state.id === 'in-mh') return mh;

  return [
    { id: `${state.id}-d1`, name: `${state.capital || state.name} City`, state: state.name, aqi: Math.max(10, state.aqi + 12) },
    { id: `${state.id}-d2`, name: `${state.name} Rural`, state: state.name, aqi: Math.max(10, state.aqi - 8) }
  ];
}

function syncSidebarList(viewState) {
  const sidebarList = document.getElementById('map-sidebar-list');
  const explorerTitle = document.getElementById('explorer-title-wrapper');

  if (!sidebarList) return;

  lastViewState = viewState;
  sidebarList.innerHTML = '';

  // Apply sorting filter
  let sortedData = [...viewState.data];
  if (currentSortMode === 'highest') {
    sortedData.sort((a, b) => b.aqi - a.aqi);
  } else if (currentSortMode === 'lowest') {
    sortedData.sort((a, b) => a.aqi - b.aqi);
  } else if (currentSortMode === 'alpha') {
    sortedData.sort((a, b) => a.name.localeCompare(b.name));
  }

  // Setup Sorting button events once on sync load
  const highestBtn = document.getElementById('sort-highest');
  const lowestBtn = document.getElementById('sort-lowest');
  const alphaBtn = document.getElementById('sort-alpha');

  if (highestBtn && lowestBtn && alphaBtn && !highestBtn.dataset.bound) {
    highestBtn.dataset.bound = "true";

    const updateSortStyle = (activeBtn) => {
      [highestBtn, lowestBtn, alphaBtn].forEach(btn => {
        btn.className = 'px-1.5 py-0.5 rounded text-[9px] font-semibold text-slate-500 hover:text-slate-800 transition-all';
      });
      activeBtn.className = 'px-1.5 py-0.5 rounded text-[9px] font-bold bg-white text-slate-800 shadow-sm transition-all';
    };

    highestBtn.addEventListener('click', () => {
      currentSortMode = 'highest';
      updateSortStyle(highestBtn);
      syncSidebarList(lastViewState);
    });

    lowestBtn.addEventListener('click', () => {
      currentSortMode = 'lowest';
      updateSortStyle(lowestBtn);
      syncSidebarList(lastViewState);
    });

    alphaBtn.addEventListener('click', () => {
      currentSortMode = 'alpha';
      updateSortStyle(alphaBtn);
      syncSidebarList(lastViewState);
    });
  }

  if (viewState.view === 'national') {
    if (explorerTitle) {
      explorerTitle.innerHTML = `
        <h3 class="font-bold text-slate-800 text-sm">State-level Air Quality</h3>
        <p class="text-[10px] text-slate-400 mt-0.5 font-mono uppercase tracking-wider">Pan-India Index</p>
      `;
    }

    sortedData.forEach(state => {
      const level = getAQILevel(state.aqi);
      
      // Calculate inline trend sparkline data points
      const seed = (state.id || state.name).charCodeAt(0);
      const isImproving = (seed % 2 === 0);
      const hist = isImproving
        ? [state.aqi + 15, state.aqi + 12, state.aqi + 8, state.aqi + 5, state.aqi]
        : [state.aqi - 12, state.aqi - 8, state.aqi - 5, state.aqi - 2, state.aqi];
      const minVal = Math.min(...hist) - 2;
      const maxVal = Math.max(...hist) + 2;
      const range = (maxVal - minVal) || 10;
      const svgPoints = hist.map((v, i) => `${(i / 4) * 36 + 2},${14 - ((v - minVal) / range) * 12}`).join(' ');
      const trendColor = isImproving ? '#16a34a' : '#dc2626';
      const trendIcon = isImproving ? 'trending_down' : 'trending_up';

      const wrapper = document.createElement('div');
      wrapper.className = 'state-accordion-wrapper border-b border-slate-200/40 py-1.5 last:border-0';
      wrapper.innerHTML = `
        <div class="flex items-center justify-between p-2 rounded-lg hover:bg-slate-100 cursor-pointer transition-colors border border-transparent hover:border-slate-200 select-none" data-accordion-header="${state.id}">
          <div class="flex items-center gap-1.5">
            <span class="material-symbols-outlined text-[16px] text-slate-400 transition-transform duration-200 accordion-arrow" id="arrow-${state.id}">chevron_right</span>
            <div>
              <div class="font-semibold text-slate-800 text-xs">${state.name}</div>
              <div class="text-[9px] text-slate-400">${state.capital}</div>
            </div>
          </div>
          <div class="flex items-center gap-3">
            <!-- Sparkline -->
            <div class="flex items-center gap-1" title="${isImproving ? 'Improving' : 'Deteriorating'} AQI trend">
              <svg width="38" height="15" class="overflow-visible">
                <polyline fill="none" stroke="${trendColor}" stroke-width="1.5" points="${svgPoints}" stroke-linecap="round" stroke-linejoin="round" />
              </svg>
              <span class="material-symbols-outlined text-[12px] font-bold" style="color: ${trendColor}">${trendIcon}</span>
            </div>
            
            <div class="flex items-center gap-1.5">
              <span class="font-bold text-xs text-slate-700">${state.aqi}</span>
              <span class="w-2.5 h-2.5 rounded-full" style="background-color: ${level.color}"></span>
            </div>
          </div>
        </div>
        <div id="accordion-body-${state.id}" class="hidden pl-6 pr-1 py-1 space-y-1 bg-slate-50/60 rounded-lg mt-1 border-l-2 border-slate-200">
          <!-- District rows will be rendered here -->
        </div>
      `;

      const header = wrapper.querySelector(`[data-accordion-header="${state.id}"]`);
      const body = wrapper.querySelector(`#accordion-body-${state.id}`);
      const arrow = wrapper.querySelector(`#arrow-${state.id}`);

      // Render districts inside accordion
      const districtsList = getDistrictsForState(state);
      districtsList.forEach(dist => {
        const dLevel = getAQILevel(dist.aqi);
        const distRow = document.createElement('div');
        distRow.className = 'district-row flex items-center justify-between p-1.5 rounded hover:bg-slate-200/50 cursor-pointer transition-colors';
        distRow.setAttribute('data-district-name', dist.name.toLowerCase());
        distRow.innerHTML = `
          <span class="text-[11px] text-slate-600 font-medium">${dist.name}</span>
          <div class="flex items-center gap-1.5">
            <span class="text-[10px] text-slate-500 font-semibold">${dist.aqi}</span>
            <span class="w-1.5 h-1.5 rounded-full" style="background-color: ${dLevel.color}"></span>
          </div>
        `;
        distRow.addEventListener('click', (ev) => {
          ev.stopPropagation();
          import('./map.js').then(m => {
            m.zoomToState(state.id);
            window.__aerostreet?.showToast?.(`Selected district: ${dist.name} (AQI: ${dist.aqi})`, 'success');
          });
        });
        body.appendChild(distRow);
      });

      header.addEventListener('click', () => {
        const isCollapsed = body.classList.contains('hidden');
        
        // Collapse all others
        sidebarList.querySelectorAll('[id^="accordion-body-"]').forEach(b => {
          if (b.id !== `accordion-body-${state.id}`) b.classList.add('hidden');
        });
        sidebarList.querySelectorAll('.accordion-arrow').forEach(a => {
          if (a.id !== `arrow-${state.id}`) a.classList.remove('rotate-90');
        });

        if (isCollapsed) {
          body.classList.remove('hidden');
          arrow.classList.add('rotate-90');
          import('./map.js').then(m => m.zoomToState(state.id));
        } else {
          body.classList.add('hidden');
          arrow.classList.remove('rotate-90');
          import('./map.js').then(m => m.renderNationalMap());
        }
      });

      sidebarList.appendChild(wrapper);
    });

  } else if (viewState.view === 'state') {
    if (explorerTitle) {
      explorerTitle.innerHTML = `
        <h3 class="font-bold text-slate-800 text-sm">${viewState.name} Districts</h3>
        <p class="text-[10px] text-slate-400 mt-0.5 font-mono uppercase tracking-wider">Regional Grid</p>
      `;
    }

    sortedData.forEach(dist => {
      const level = getAQILevel(dist.aqi);
      
      const seed = (dist.id || dist.name).charCodeAt(0);
      const isImproving = (seed % 2 === 0);
      const hist = isImproving
        ? [dist.aqi + 10, dist.aqi + 8, dist.aqi + 6, dist.aqi + 3, dist.aqi]
        : [dist.aqi - 8, dist.aqi - 6, dist.aqi - 4, dist.aqi - 2, dist.aqi];
      const minVal = Math.min(...hist) - 2;
      const maxVal = Math.max(...hist) + 2;
      const range = (maxVal - minVal) || 10;
      const svgPoints = hist.map((v, i) => `${(i / 4) * 36 + 2},${14 - ((v - minVal) / range) * 12}`).join(' ');
      const trendColor = isImproving ? '#16a34a' : '#dc2626';
      const trendIcon = isImproving ? 'trending_down' : 'trending_up';

      const row = document.createElement('div');
      row.className = 'flex items-center justify-between p-2 rounded-lg hover:bg-slate-100 cursor-pointer transition-colors border border-transparent hover:border-slate-200';
      row.innerHTML = `
        <div>
          <div class="font-semibold text-slate-800 text-xs">${dist.name}</div>
          <div class="text-[9px] text-slate-400">${dist.state || 'District'}</div>
        </div>
        <div class="flex items-center gap-3">
          <!-- Sparkline -->
          <div class="flex items-center gap-1" title="${isImproving ? 'Improving' : 'Deteriorating'} AQI trend">
            <svg width="38" height="15" class="overflow-visible">
              <polyline fill="none" stroke="${trendColor}" stroke-width="1.5" points="${svgPoints}" stroke-linecap="round" stroke-linejoin="round" />
            </svg>
            <span class="material-symbols-outlined text-[12px] font-bold" style="color: ${trendColor}">${trendIcon}</span>
          </div>

          <div class="flex items-center gap-1.5">
            <span class="font-bold text-xs text-slate-700">${dist.aqi}</span>
            <span class="w-2.5 h-2.5 rounded-full" style="background-color: ${level.color}"></span>
          </div>
        </div>
      `;
      row.addEventListener('click', () => {
        window.__aerostreet?.showToast?.(`Selected district: ${dist.name} (AQI: ${dist.aqi})`, 'success');
      });
      sidebarList.appendChild(row);
    });
  }

  // Set up search filter listener once
  const searchInput = document.getElementById('map-sidebar-search') || document.getElementById('sidebar-search');
  if (searchInput && !searchInput.dataset.bound) {
    searchInput.dataset.bound = "true";
    searchInput.addEventListener('input', (e) => {
      const q = e.target.value.toLowerCase().trim();
      const wrappers = sidebarList.querySelectorAll('.state-accordion-wrapper');
      
      if (viewState.view === 'national') {
        wrappers.forEach(wrap => {
          const header = wrap.querySelector('[data-accordion-header]');
          const body = wrap.querySelector('[id^="accordion-body-"]');
          const arrow = wrap.querySelector('.accordion-arrow');
          const stateName = header.textContent.toLowerCase();
          
          let stateMatches = stateName.includes(q);
          let districtMatches = false;
          
          const districts = wrap.querySelectorAll('.district-row');
          districts.forEach(dRow => {
            const dName = dRow.getAttribute('data-district-name');
            if (dName.includes(q)) {
              districtMatches = true;
              dRow.style.display = '';
            } else {
              dRow.style.display = q === '' ? '' : 'none';
            }
          });

          if (q === '') {
            wrap.style.display = '';
            body.classList.add('hidden');
            arrow.classList.remove('rotate-90');
          } else if (stateMatches || districtMatches) {
            wrap.style.display = '';
            body.classList.remove('hidden');
            arrow.classList.add('rotate-90');
          } else {
            wrap.style.display = 'none';
          }
        });
      } else {
        const items = sidebarList.querySelectorAll('.flex-1 > div, #map-sidebar-list > div, div.flex');
        items.forEach(item => {
          const text = item.textContent.toLowerCase();
          item.style.display = text.includes(q) ? '' : 'none';
        });
      }
    });
  }

  // Clear search input on view changes
  if (searchInput) {
    searchInput.value = '';
  }
}

// ============================================
// Animation Systems
// ============================================

function initAnimations() {
  const items = document.querySelectorAll('.interactive-card, .glass-panel, table');
  items.forEach(el => el.classList.add('animate-fadeInUp'));
}

/**
 * Enterprise Stat Count-Up Animation
 */
function initCountUpStats() {
  const statElements = document.querySelectorAll('[data-target]');
  if (statElements.length === 0) return;

  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting || entry.intersectionRatio > 0) {
          animateValue(entry.target);
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0, rootMargin: '0px 0px -50px 0px' });

    statElements.forEach(el => observer.observe(el));
  } else {
    // Fallback for browsers without IntersectionObserver support
    statElements.forEach(el => animateValue(el));
  }
}

function animateValue(obj) {
  const target = parseFloat(obj.getAttribute('data-target'));
  if (isNaN(target)) return;
  const decimals = parseInt(obj.getAttribute('data-decimals') || '0');
  const suffix = obj.getAttribute('data-suffix') || '';
  const duration = 2000;
  let startTimestamp = null;

  const step = (timestamp) => {
    if (!startTimestamp) startTimestamp = timestamp;
    const progress = Math.min((timestamp - startTimestamp) / duration, 1);
    
    // ease-out quartic
    const easeProgress = 1 - Math.pow(1 - progress, 4);
    const value = easeProgress * target;
    
    obj.innerHTML = value.toFixed(decimals) + suffix;
    
    if (progress < 1) {
      window.requestAnimationFrame(step);
    }
  };
  window.requestAnimationFrame(step);
}

// ============================================
// Page Initializers
// ============================================

async function initNationalPage() {
  console.log('[App] National Page Init');
  const mapContainer = document.getElementById('interactive-map');
  if (mapContainer) {
    registerOnStateChange(syncSidebarList);
    await initMap('interactive-map');
  }
}

async function initDistrictPage() {
  console.log('[App] District Page Init');
  const mapContainer = document.getElementById('map-container');
  if (mapContainer) {
    registerOnStateChange(syncSidebarList);
    await initMap('map-container');

    // Wire up Compare Districts button
    const compareBtn = document.getElementById('compare-districts-btn');
    if (compareBtn) {
      compareBtn.addEventListener('click', async () => {
        const { showComparisonModal } = await import('./compare-districts.js');
        showComparisonModal();
      });
    }

    // Wire up Map Selector Toggles
    const toggleSvgBtn = document.getElementById('toggle-svg-map');
    const togglePredictiveBtn = document.getElementById('toggle-predictive-map');
    const toggleWeatherBtn = document.getElementById('toggle-weather-vectors');

    let weatherActive = false;

    if (toggleSvgBtn && togglePredictiveBtn) {
      toggleSvgBtn.addEventListener('click', async () => {
        toggleSvgBtn.className = 'px-4 py-1.5 rounded-full text-xs font-semibold flex items-center gap-1.5 transition-all text-white bg-primary';
        togglePredictiveBtn.className = 'px-4 py-1.5 rounded-full text-xs font-semibold flex items-center gap-1.5 transition-all text-slate-400 hover:text-white';
        
        await initMap('map-container');
      });

      togglePredictiveBtn.addEventListener('click', async () => {
        togglePredictiveBtn.className = 'px-4 py-1.5 rounded-full text-xs font-semibold flex items-center gap-1.5 transition-all text-white bg-primary';
        toggleSvgBtn.className = 'px-4 py-1.5 rounded-full text-xs font-semibold flex items-center gap-1.5 transition-all text-slate-400 hover:text-white';
        
        if (weatherActive) {
          weatherActive = false;
          if (toggleWeatherBtn) {
            toggleWeatherBtn.className = 'px-4 py-1.5 rounded-full text-xs font-semibold flex items-center gap-1.5 transition-all text-slate-400 hover:text-white';
          }
          const { setWeatherVectors } = await import('./map.js');
          setWeatherVectors(false);
        }

        const { initPredictiveHeatmap } = await import('./predictive-map.js');
        await initPredictiveHeatmap('map-container');
      });
    }

    if (toggleWeatherBtn) {
      toggleWeatherBtn.addEventListener('click', async () => {
        weatherActive = !weatherActive;
        if (weatherActive) {
          toggleWeatherBtn.className = 'px-4 py-1.5 rounded-full text-xs font-semibold flex items-center gap-1.5 transition-all text-white bg-primary animate-pulse';
          // Ensure SVG map is shown
          if (togglePredictiveBtn && togglePredictiveBtn.className.includes('bg-primary')) {
            if (toggleSvgBtn) toggleSvgBtn.click();
          }
          const { setWeatherVectors } = await import('./map.js');
          setWeatherVectors(true);
        } else {
          toggleWeatherBtn.className = 'px-4 py-1.5 rounded-full text-xs font-semibold flex items-center gap-1.5 transition-all text-slate-400 hover:text-white';
          const { setWeatherVectors } = await import('./map.js');
          setWeatherVectors(false);
        }
      });
    }
  }
}

async function initMunicipalityPage() {
  console.log('[App] Municipality Page Init');
  
  // Load municipality hub logic
  const { initMunicipalityHub } = await import('./municipality-hub.js');
  initMunicipalityHub();
  
  await renderRecommendationsPanel('ai-recommendations', 'delhi');
  await renderTrendChart('aqi-trend-chart', 'delhi');
  await renderCommunityPanel('community-panel');
}

// ============================================
// Secure Live AQI Sync for KPI Cards
// ============================================

async function updateDashboardAQI() {
  try {
    console.log('[Sync] Fetching live AQI from secure backend endpoint...');
    const response = await fetch('/api/live-aqi');
    if (!response.ok) throw new Error(`Live AQI API error: ${response.status}`);
    
    const locations = await response.json();
    if (!locations || locations.length === 0) return;

    // Calculate aggregates
    const totalAqi = locations.reduce((sum, loc) => sum + loc.aqi, 0);
    const avgAqi = Math.round(totalAqi / locations.length);

    let mostPolluted = locations[0];
    let cleanestState = locations[0];

    locations.forEach(loc => {
      if (loc.aqi > mostPolluted.aqi) mostPolluted = loc;
      if (loc.aqi < cleanestState.aqi) cleanestState = loc;
    });

    // Update KPI UI Elements
    const kpiNational = document.getElementById('kpi-national-aqi');
    if (kpiNational) {
      kpiNational.textContent = avgAqi;
      kpiNational.setAttribute('data-target', avgAqi);
    }

    const cleanCityName = (loc) => {
      let city = loc.locality;
      if (!city || city.toLowerCase() === 'india' || city.toLowerCase() === 'unknown') {
        if (loc.name) {
          const parts = loc.name.split(/,|\-|—/);
          if (parts.length > 1) {
            city = parts[1].trim();
          } else {
            city = loc.name.trim();
          }
        }
      }
      if (city) {
        city = city.replace(/\b(DPCC|MPCB|WBPCB|KSPCB|HSPCB|UPPCB|PCB|CPCB|APPCB|GPCB|SPCB|TSPCD|OSPCB)\b/gi, '')
                   .replace(/[-–—,]/g, '')
                   .trim();
      }
      if (!city || city.toLowerCase() === 'india') {
        city = 'Delhi';
      }
      return city;
    };

    const kpiMostPolluted = document.getElementById('kpi-most-polluted');
    if (kpiMostPolluted) {
      kpiMostPolluted.innerHTML = `${cleanCityName(mostPolluted)} <span class="text-xs text-slate-400 font-normal ml-1">AQI ${mostPolluted.aqi}</span>`;
    }

    const kpiCleanest = document.getElementById('kpi-cleanest-state');
    if (kpiCleanest) {
      kpiCleanest.innerHTML = `${cleanCityName(cleanestState)} <span class="text-xs text-slate-400 font-normal ml-1">AQI ${cleanestState.aqi}</span>`;
    }
    
    console.log('[Sync] Dashboard KPIs successfully updated with real-time OpenAQ data');
  } catch (err) {
    console.warn('[Sync] Dashboard live sync failed, using fallback static config:', err.message);
  }
}

// ============================================
// Bootstrap Application
// ============================================

document.addEventListener('DOMContentLoaded', async () => {
  console.log('[AeroStreet-AI] Bootstrapping...');
  try {
    await initAuth();
    await initPage();
    await updateDashboardAQI();
    
    if (IS_DEMO_MODE) {
      showToast('Running in Demo mode. Configure environment keys for production live-feed.', 'warning', 5000);
    }
  } catch (err) {
    console.error('[AeroStreet-AI] Bootstrap error:', err);
  }
});
