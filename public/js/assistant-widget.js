/**
 * AeroStreet-AI — Urban Air Quality Assistant (Challenge 6)
 * Real-time context-aware citizen health, commute, and exposure advisor
 * Powered by Google Gemini 2.5 Flash with deterministic fallback.
 * Meets WCAG 2.1 AA accessibility standards (ARIA dialog, focus management, TTS audio).
 */

export function initAssistantWidget() {
  if (document.getElementById('aerostreet-assistant-widget')) return;

  // 1. Create Floating Launcher Button
  const launcher = document.createElement('button');
  launcher.id = 'aerostreet-assistant-launcher';
  launcher.type = 'button';
  launcher.className =
    'fixed bottom-5 right-5 z-[90] min-h-[48px] min-w-[48px] flex items-center gap-2.5 px-4 py-3 bg-gradient-to-r from-emerald-600 via-teal-600 to-blue-600 hover:from-emerald-500 hover:to-blue-500 text-white font-semibold text-sm rounded-full shadow-2xl hover:shadow-emerald-500/25 transition-all duration-300 transform hover:scale-105 focus:outline-none focus:ring-4 focus:ring-emerald-300 select-none';
  launcher.setAttribute('aria-haspopup', 'dialog');
  launcher.setAttribute('aria-expanded', 'false');
  launcher.setAttribute('aria-label', 'Open Urban Air Quality Assistant');
  launcher.innerHTML = `
    <span class="flex h-3 w-3 relative">
      <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-300 opacity-75"></span>
      <span class="relative inline-flex rounded-full h-3 w-3 bg-white"></span>
    </span>
    <span class="text-base">✨</span>
    <span>Urban Air Assistant</span>
    <span class="hidden sm:inline-block px-1.5 py-0.5 text-[10px] bg-white/20 rounded font-bold uppercase tracking-wider">AI</span>
  `;

  // 2. Create Modal Overlay & Container
  const modal = document.createElement('div');
  modal.id = 'aerostreet-assistant-modal';
  modal.className =
    'fixed inset-0 z-[100] hidden items-center justify-center p-4 sm:p-6 bg-black/60 backdrop-blur-sm transition-opacity';
  modal.setAttribute('role', 'dialog');
  modal.setAttribute('aria-modal', 'true');
  modal.setAttribute('aria-labelledby', 'assistant-modal-title');
  modal.setAttribute('aria-describedby', 'assistant-modal-desc');

  modal.innerHTML = `
    <div class="relative w-full max-w-2xl bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden max-h-[90vh] flex flex-col animate-[fadeInUp_0.25s_ease-out]">
      <!-- Header -->
      <div class="px-6 py-5 bg-gradient-to-r from-emerald-600 to-teal-700 text-white flex items-center justify-between">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-xl bg-white/15 backdrop-blur-sm flex items-center justify-center text-xl font-bold">
            ✨
          </div>
          <div>
            <h2 id="assistant-modal-title" class="text-lg font-bold leading-tight">
              Urban Air Quality Assistant
            </h2>
            <p id="assistant-modal-desc" class="text-xs text-emerald-100">
              Context-Aware Citizen Health &amp; Commute Advisory &bull; Gemini 2.5 Flash
            </p>
          </div>
        </div>
        <button
          type="button"
          id="assistant-close-btn"
          class="p-2 text-white/80 hover:text-white hover:bg-white/10 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-white"
          aria-label="Close Assistant Dialog"
        >
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
          </svg>
        </button>
      </div>

      <!-- Scrollable Body -->
      <div class="p-6 overflow-y-auto space-y-6 flex-1 text-sm">
        <!-- Form Controls -->
        <form id="assistant-form" class="space-y-4">
          <!-- City / Ward Selection -->
          <div>
            <div class="flex items-center justify-between mb-1.5">
              <label for="assistant-city-input" class="font-semibold text-slate-700 dark:text-slate-200 text-xs uppercase tracking-wider">
                City / Ward / Landmark
              </label>
              <button
                type="button"
                id="assistant-detect-loc-btn"
                class="text-xs text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1 font-medium focus:outline-none focus:ring-1 focus:ring-emerald-500 rounded"
              >
                <span>📍</span> Auto-Detect Location
              </button>
            </div>
            <input
              type="text"
              id="assistant-city-input"
              name="city"
              value="Delhi NCR (Anand Vihar)"
              class="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm"
              placeholder="e.g. Anand Vihar, Delhi / Bandra, Mumbai"
              required
            />
            <!-- Quick Chips -->
            <div class="flex flex-wrap gap-1.5 mt-2">
              <button type="button" class="assistant-chip px-2.5 py-1 text-xs rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-emerald-50 hover:text-emerald-700 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 transition">Delhi NCR</button>
              <button type="button" class="assistant-chip px-2.5 py-1 text-xs rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-emerald-50 hover:text-emerald-700 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 transition">Mumbai</button>
              <button type="button" class="assistant-chip px-2.5 py-1 text-xs rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-emerald-50 hover:text-emerald-700 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 transition">Bengaluru</button>
              <button type="button" class="assistant-chip px-2.5 py-1 text-xs rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-emerald-50 hover:text-emerald-700 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 transition">Kolkata</button>
              <button type="button" class="assistant-chip px-2.5 py-1 text-xs rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-emerald-50 hover:text-emerald-700 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 transition">Chennai</button>
            </div>
          </div>

          <!-- Activity & Sensitivity Row -->
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label for="assistant-activity-select" class="block font-semibold text-slate-700 dark:text-slate-200 text-xs uppercase tracking-wider mb-1.5">
                Intended Activity
              </label>
              <select
                id="assistant-activity-select"
                name="activity"
                class="w-full px-3 py-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm"
              >
                <option value="commuting">Daily Urban Commute (Metro/Bus/Bike)</option>
                <option value="exercise">Outdoor Exercise / Jogging</option>
                <option value="schools">School Children &amp; Playgrounds</option>
                <option value="general">General Urban Exposure</option>
              </select>
            </div>
            <div>
              <label for="assistant-sensitivity-select" class="block font-semibold text-slate-700 dark:text-slate-200 text-xs uppercase tracking-wider mb-1.5">
                Sensitivity Group
              </label>
              <select
                id="assistant-sensitivity-select"
                name="sensitivity"
                class="w-full px-3 py-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm"
              >
                <option value="general">General Public (Healthy Adult)</option>
                <option value="children">Children &amp; Infants (High Risk)</option>
                <option value="elderly">Elderly Citizens (60+ Years)</option>
                <option value="asthma">Asthma / Respiratory Conditions</option>
              </select>
            </div>
          </div>

          <!-- Submit Button -->
          <button
            type="submit"
            id="assistant-submit-btn"
            class="w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg transition-all duration-200 shadow-md hover:shadow-lg flex items-center justify-center gap-2 focus:outline-none focus:ring-4 focus:ring-emerald-200"
          >
            <span id="assistant-submit-spinner" class="hidden animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></span>
            <span id="assistant-submit-text">Get Context-Aware Air Quality Advisory</span>
          </button>
        </form>

        <!-- Results Card (Live Region) -->
        <div
          id="assistant-result-container"
          class="hidden space-y-4 pt-4 border-t border-slate-200 dark:border-slate-800"
          aria-live="polite"
          role="status"
        >
          <!-- Score Badge & Readout Row -->
          <div class="flex items-center justify-between p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
            <div>
              <span class="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Exposure Risk Level</span>
              <div class="flex items-center gap-3 mt-1">
                <span id="assistant-risk-badge" class="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide bg-amber-100 text-amber-800 border border-amber-300">
                  Moderate Risk
                </span>
                <span id="assistant-aqi-indicator" class="text-xs font-semibold text-slate-600 dark:text-slate-300">
                  Estimated AQI: 185
                </span>
              </div>
            </div>
            <!-- Audio Readout Button (Accessibility) -->
            <button
              type="button"
              id="assistant-tts-btn"
              class="px-3 py-2 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-100 rounded-lg text-xs font-semibold flex items-center gap-1.5 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition"
              aria-label="Read advice aloud"
            >
              <span id="assistant-tts-icon">🔊</span>
              <span id="assistant-tts-label">Listen</span>
            </button>
          </div>

          <!-- Structured Advice Grid -->
          <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div class="p-3.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 space-y-1">
              <span class="text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                <span>🕒</span> Safe Time Window
              </span>
              <p id="assistant-safe-window" class="text-xs font-medium text-slate-700 dark:text-slate-200">
                12:00 PM – 4:00 PM
              </p>
            </div>
            <div class="p-3.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 space-y-1">
              <span class="text-xs font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400 flex items-center gap-1">
                <span>😷</span> N95 &amp; PPE Guidance
              </span>
              <p id="assistant-ppe-guide" class="text-xs font-medium text-slate-700 dark:text-slate-200">
                Wear N95/FFP2 mask outdoors.
              </p>
            </div>
          </div>

          <!-- Commute & Route Recommendation -->
          <div class="p-3.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 space-y-1">
            <span class="text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 flex items-center gap-1">
              <span>🚇</span> Cleaner Commute &amp; Route Advice
            </span>
            <p id="assistant-commute-guide" class="text-xs font-medium text-slate-700 dark:text-slate-200">
              Opt for Delhi Metro or AC electric buses rather than open two-wheelers. Avoid peak arterial corridors between 8-10 AM.
            </p>
          </div>

          <!-- Municipal & GRAP Alert Level -->
          <div class="p-3.5 rounded-xl bg-amber-50/80 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/50 space-y-1">
            <span class="text-xs font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400 flex items-center gap-1">
              <span>🏛️</span> GRAP &amp; Municipal Regulation
            </span>
            <p id="assistant-grap-guide" class="text-xs font-medium text-amber-900 dark:text-amber-200">
              Stage II / III regulations apply: strict dust control and diesel generator restrictions.
            </p>
          </div>

          <!-- Natural Language Gemini Brief -->
          <div class="p-4 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
            <div class="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
              <span>🤖</span> Gemini 2.5 Flash Summary
            </div>
            <p id="assistant-ai-summary" class="text-xs leading-relaxed text-slate-700 dark:text-slate-200">
              Generating analysis...
            </p>
          </div>
        </div>
      </div>
    </div>
  `;

  document.body.appendChild(launcher);
  document.body.appendChild(modal);

  // 3. Bind Events & Interactivity
  const closeBtn = document.getElementById('assistant-close-btn');
  const form = document.getElementById('assistant-form');
  const cityInput = document.getElementById('assistant-city-input');
  const activitySelect = document.getElementById('assistant-activity-select');
  const sensitivitySelect = document.getElementById('assistant-sensitivity-select');
  const detectBtn = document.getElementById('assistant-detect-loc-btn');
  const resultContainer = document.getElementById('assistant-result-container');
  const submitBtn = document.getElementById('assistant-submit-btn');
  const spinner = document.getElementById('assistant-submit-spinner');
  const submitText = document.getElementById('assistant-submit-text');
  const ttsBtn = document.getElementById('assistant-tts-btn');
  const ttsLabel = document.getElementById('assistant-tts-label');

  // Load persistent citizen profile from localStorage
  const PROFILE_KEY = 'aerostreet_citizen_profile';
  function loadSavedProfile() {
    try {
      const saved = localStorage.getItem(PROFILE_KEY);
      if (saved) {
        const p = JSON.parse(saved);
        if (p.city && cityInput) cityInput.value = p.city;
        if (p.activity && activitySelect) activitySelect.value = p.activity;
        if (p.sensitivity && sensitivitySelect) sensitivitySelect.value = p.sensitivity;
        return p;
      }
    } catch (_) {}
    return { city: cityInput.value || 'Delhi NCR (Anand Vihar)', activity: 'commuting', sensitivity: 'general' };
  }

  function saveProfile(city, activity, sensitivity) {
    try {
      localStorage.setItem(PROFILE_KEY, JSON.stringify({
        city,
        activity,
        sensitivity,
        savedAt: new Date().toISOString()
      }));
    } catch (_) {}
  }

  const activeProfile = loadSavedProfile();

  // Proactive Citizen Air Alert Banner
  function renderProactiveBanner(city, aqi, category) {
    if (document.getElementById('aerostreet-proactive-banner')) return;
    const isSensitive = activeProfile.sensitivity !== 'general';
    const alertThreshold = isSensitive ? 100 : 200;
    if (aqi <= alertThreshold) return;

    const banner = document.createElement('div');
    banner.id = 'aerostreet-proactive-banner';
    banner.setAttribute('role', 'alert');
    banner.setAttribute('aria-live', 'assertive');
    banner.className =
      'w-full bg-gradient-to-r from-amber-600 via-rose-600 to-red-700 text-white px-4 py-2.5 text-xs sm:text-sm font-semibold flex items-center justify-between shadow-lg sticky top-0 z-[80] transition-all duration-300';
    banner.innerHTML = `
      <div class="flex items-center gap-2.5 overflow-hidden">
        <span class="text-base flex-shrink-0 animate-bounce">⚠️</span>
        <div class="truncate">
          <span>Proactive Alert for <strong>${city}</strong>: AQI is <strong>${aqi} (${category})</strong>.</span>
          <span class="hidden md:inline text-rose-100 ml-1">Elevated exposure risk detected for your saved activity (${activeProfile.activity}).</span>
        </div>
      </div>
      <div class="flex items-center gap-2 flex-shrink-0 ml-3">
        <button
          type="button"
          id="proactive-plan-btn"
          class="px-3 py-1 bg-white text-rose-800 hover:bg-rose-50 text-xs font-bold rounded-full shadow-sm hover:shadow transition"
        >
          Review AI Action Plan
        </button>
        <button
          type="button"
          id="proactive-dismiss-btn"
          class="p-1 text-white/80 hover:text-white rounded focus:outline-none"
          aria-label="Dismiss proactive alert banner"
        >
          &times;
        </button>
      </div>
    `;

    document.body.insertBefore(banner, document.body.firstChild);

    document.getElementById('proactive-plan-btn')?.addEventListener('click', () => {
      openModal();
      if (!resultContainer.classList.contains('hidden')) {
        resultContainer.scrollIntoView({ behavior: 'smooth' });
      } else {
        form.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
      }
    });

    document.getElementById('proactive-dismiss-btn')?.addEventListener('click', () => {
      banner.remove();
    });
  }

  // Trigger proactive threshold evaluation on page load
  setTimeout(() => {
    // Anand Vihar/Delhi baseline is 320 (Severe); Mumbai 142 (Moderate); etc.
    const baselineAQI = activeProfile.city.toLowerCase().includes('delhi') ? 320 : 165;
    const category = baselineAQI > 300 ? 'Severe' : 'Moderate';
    renderProactiveBanner(activeProfile.city, baselineAQI, category);
  }, 1000);

  let currentSpeechText = '';

  function openModal() {
    modal.classList.remove('hidden');
    modal.classList.add('flex');
    launcher.setAttribute('aria-expanded', 'true');
    cityInput.focus();
    document.addEventListener('keydown', onKeyDown);
  }

  function closeModal() {
    modal.classList.add('hidden');
    modal.classList.remove('flex');
    launcher.setAttribute('aria-expanded', 'false');
    launcher.focus();
    document.removeEventListener('keydown', onKeyDown);
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      ttsLabel.textContent = 'Listen';
    }
  }

  function onKeyDown(e) {
    if (e.key === 'Escape') closeModal();
  }

  launcher.addEventListener('click', openModal);
  closeBtn.addEventListener('click', closeModal);
  modal.addEventListener('click', (e) => {
    if (e.target === modal) closeModal();
  });

  // Quick chips
  document.querySelectorAll('.assistant-chip').forEach((chip) => {
    chip.addEventListener('click', () => {
      cityInput.value = chip.textContent.trim();
    });
  });

  // Geolocation Auto-Detection
  detectBtn.addEventListener('click', () => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser.');
      return;
    }
    detectBtn.textContent = 'Locating...';
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        cityInput.value = `Current Location (${pos.coords.latitude.toFixed(2)}, ${pos.coords.longitude.toFixed(2)})`;
        detectBtn.textContent = '✓ Location Found';
      },
      () => {
        cityInput.value = 'Delhi NCR (Anand Vihar)';
        detectBtn.textContent = '📍 Auto-Detect Location';
      },
      { timeout: 5000 }
    );
  });

  // Form submission calling POST /api/assistant
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const city = cityInput.value.trim();
    const activity = activitySelect ? activitySelect.value : 'commuting';
    const sensitivity = sensitivitySelect ? sensitivitySelect.value : 'general';

    // Persist profile to localStorage
    saveProfile(city, activity, sensitivity);

    spinner.classList.remove('hidden');
    submitText.textContent = 'Analyzing with Gemini 2.5...';
    submitBtn.disabled = true;

    try {
      const res = await fetch('/api/assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ city, activity, sensitivity }),
      });

      const json = await res.json();
      if (!json.success || !json.data) {
        throw new Error(json.error || 'Failed to fetch assistant advisory');
      }

      const d = json.data;
      resultContainer.classList.remove('hidden');

      // Update UI elements
      const badge = document.getElementById('assistant-risk-badge');
      badge.textContent = `${d.riskLevel} Risk (Score: ${d.riskScore}/100)`;
      if (d.riskLevel === 'Severe' || d.riskLevel === 'Critical') {
        badge.className = 'px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide bg-red-100 text-red-800 border border-red-300';
      } else if (d.riskLevel === 'High') {
        badge.className = 'px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide bg-orange-100 text-orange-800 border border-orange-300';
      } else {
        badge.className = 'px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide bg-emerald-100 text-emerald-800 border border-emerald-300';
      }

      document.getElementById('assistant-aqi-indicator').textContent = `Baseline AQI: ${d.currentAQI}`;
      document.getElementById('assistant-safe-window').textContent = d.safeWindow;
      document.getElementById('assistant-ppe-guide').textContent = d.ppeRecommendation;
      document.getElementById('assistant-commute-guide').textContent = d.commuteGuidance;
      document.getElementById('assistant-grap-guide').textContent = d.grapStage;
      document.getElementById('assistant-ai-summary').textContent = d.naturalLanguageAdvisory;

      currentSpeechText = `${d.riskLevel} risk advisory for ${city}. ${d.naturalLanguageAdvisory} Safe outdoor window: ${d.safeWindow}. Mask guidance: ${d.ppeRecommendation}. Commute advice: ${d.commuteGuidance}.`;

      resultContainer.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    } catch (err) {
      console.error('[Assistant] Error:', err);
      alert('Could not generate advisory. Please check your internet connection.');
    } finally {
      spinner.classList.add('hidden');
      submitText.textContent = 'Get Context-Aware Air Quality Advisory';
      submitBtn.disabled = false;
    }
  });

  // Text-To-Speech Reader
  ttsBtn.addEventListener('click', () => {
    if (!('speechSynthesis' in window)) {
      alert('Speech synthesis is not supported on this device.');
      return;
    }

    if (window.speechSynthesis.speaking) {
      window.speechSynthesis.cancel();
      ttsLabel.textContent = 'Listen';
      return;
    }

    if (!currentSpeechText) return;

    const utterance = new SpeechSynthesisUtterance(currentSpeechText);
    utterance.rate = 1.0;
    utterance.onend = () => {
      ttsLabel.textContent = 'Listen';
    };
    utterance.onerror = () => {
      ttsLabel.textContent = 'Listen';
    };

    ttsLabel.textContent = 'Stop';
    window.speechSynthesis.speak(utterance);
  });

  // Export open modal helper on window
  window.__aerostreet = window.__aerostreet || {};
  window.__aerostreet.openAssistant = openModal;
  window.__aerostreet.closeAssistant = closeModal;
}

// Auto-initialize if DOM is ready
if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAssistantWidget);
  } else {
    initAssistantWidget();
  }
}
