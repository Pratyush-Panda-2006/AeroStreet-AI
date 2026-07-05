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

function syncSidebarList(viewState) {
  const sidebarList = document.getElementById('map-sidebar-list');
  const explorerTitle = document.getElementById('explorer-title-wrapper');

  if (!sidebarList) return;

  sidebarList.innerHTML = '';

  if (viewState.view === 'national') {
    if (explorerTitle) {
      explorerTitle.innerHTML = `
        <h3 class="font-bold text-slate-800 text-sm">State-level Air Quality</h3>
        <p class="text-[10px] text-slate-400 mt-0.5 font-mono uppercase tracking-wider">Pan-India Index</p>
      `;
    }

    viewState.data.forEach(state => {
      const level = getAQILevel(state.aqi);
      const row = document.createElement('div');
      row.className = 'flex items-center justify-between p-2 rounded-lg hover:bg-slate-100 cursor-pointer transition-colors border border-transparent hover:border-slate-200';
      row.innerHTML = `
        <div>
          <div class="font-semibold text-slate-800 text-xs">${state.name}</div>
          <div class="text-[9px] text-slate-400">${state.capital}</div>
        </div>
        <div class="flex items-center gap-2">
          <span class="font-bold text-xs text-slate-700">${state.aqi}</span>
          <span class="w-2.5 h-2.5 rounded-full" style="background-color: ${level.color}"></span>
        </div>
      `;
      row.addEventListener('click', () => {
        import('./map.js').then(m => m.zoomToState(state.id));
      });
      sidebarList.appendChild(row);
    });
  } else if (viewState.view === 'state') {
    if (explorerTitle) {
      explorerTitle.innerHTML = `
        <h3 class="font-bold text-slate-800 text-sm">${viewState.name} Districts</h3>
        <p class="text-[10px] text-slate-400 mt-0.5 font-mono uppercase tracking-wider">Regional Grid</p>
      `;
    }

    viewState.data.forEach(dist => {
      const level = getAQILevel(dist.aqi);
      const row = document.createElement('div');
      row.className = 'flex items-center justify-between p-2 rounded-lg hover:bg-slate-100 cursor-pointer transition-colors border border-transparent hover:border-slate-200';
      row.innerHTML = `
        <div>
          <div class="font-semibold text-slate-800 text-xs">${dist.name}</div>
          <div class="text-[9px] text-slate-400">${dist.state}</div>
        </div>
        <div class="flex items-center gap-2">
          <span class="font-bold text-xs text-slate-700">${dist.aqi}</span>
          <span class="w-2.5 h-2.5 rounded-full" style="background-color: ${level.color}"></span>
        </div>
      `;
      sidebarList.appendChild(row);
    });
  }

  // Set up search filter listener once
  const searchInput = document.getElementById('map-sidebar-search') || document.getElementById('sidebar-search');
  if (searchInput && !searchInput.dataset.bound) {
    searchInput.dataset.bound = "true";
    searchInput.addEventListener('input', (e) => {
      const q = e.target.value.toLowerCase();
      const list = document.getElementById('map-sidebar-list');
      if (list) {
        list.childNodes.forEach(child => {
          const text = child.textContent.toLowerCase();
          child.style.display = text.includes(q) ? '' : 'none';
        });
      }
    });
  }
  // Clear search on view change
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

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        animateValue(entry.target);
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.1 });

  statElements.forEach(el => observer.observe(el));
}

function animateValue(obj) {
  const target = parseFloat(obj.getAttribute('data-target'));
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
  }
}

async function initMunicipalityPage() {
  console.log('[App] Municipality Page Init');
  
  await renderRecommendationsPanel('ai-recommendations', 'delhi');
  await renderTrendChart('aqi-trend-chart', 'delhi');
  await renderCommunityPanel('community-panel');
}

// ============================================
// Bootstrap Application
// ============================================

document.addEventListener('DOMContentLoaded', async () => {
  console.log('[IndianAQI] Bootstrapping...');
  try {
    await initAuth();
    await initPage();
    
    if (IS_DEMO_MODE) {
      showToast('Running in Demo mode. Configure environment keys for production live-feed.', 'warning', 5000);
    }
  } catch (err) {
    console.error('[IndianAQI] Bootstrap error:', err);
  }
});
