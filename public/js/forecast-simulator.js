import { getAQILevel } from './config.js';
import { initDelhiSearch, setLocationSourceAuto } from './delhi-search.js';

let chartAqiInstance = null;
let chartWeatherInstance = null;
let currentUserCoords = null; // Store browser geolocation coords

document.addEventListener('DOMContentLoaded', () => {
  const btnLocate = document.getElementById('btn-locate');
  const btnSearch = document.getElementById('btn-search');
  
  if(btnLocate) {
    btnLocate.addEventListener('click', requestLocation);
  }
  if(btnSearch) {
    btnSearch.addEventListener('click', () => {
      const city = document.getElementById('manual-city').value.trim();
      if (city) manualSearch(city);
    });
  }

  // Handle enter key in fallback search box
  const searchInput = document.getElementById('manual-city');
  if(searchInput) {
    searchInput.addEventListener('keypress', (e) => {
      if(e.key === 'Enter') {
        const city = e.target.value.trim();
        if (city) manualSearch(city);
      }
    });
  }

  // "Use my location" button on the dashboard
  const btnMyLocation = document.getElementById('btn-my-location');
  if (btnMyLocation) {
    btnMyLocation.addEventListener('click', () => {
      if (currentUserCoords) {
        setLocationSourceAuto();
        showDashboardLoading();
        fetchEnvironmentData(currentUserCoords.lat, currentUserCoords.lng);
      } else {
        // Re-request geolocation
        requestLocationForDashboard();
      }
    });
  }

  // Listen for Delhi search selections
  window.addEventListener('delhiSearchSelected', (e) => {
    const { lat, lng } = e.detail;
    showDashboardLoading();
    fetchEnvironmentData(lat, lng);
  });

  // Initialize Delhi search module
  initDelhiSearch();

  // Automatically ask for location on load
  requestLocation();
});

function requestLocation() {
  const statusDiv = document.getElementById('location-status');
  const fallbackDiv = document.getElementById('fallback-search');
  
  statusDiv.innerHTML = '<p class="text-sm font-bold text-slate-500 animate-pulse bg-slate-100 px-6 py-3 rounded-full inline-block mt-2">Requesting location permissions...</p>';
  fallbackDiv.classList.add('hidden');

  if (!navigator.geolocation) {
    statusDiv.innerHTML = '<p class="text-sm font-bold text-red-500 bg-red-50 px-6 py-3 rounded-full inline-block mt-2">Geolocation is not supported by your browser.</p>';
    fallbackDiv.classList.remove('hidden');
    return;
  }

  navigator.geolocation.getCurrentPosition(
    (position) => {
      const lat = position.coords.latitude;
      const lng = position.coords.longitude;
      currentUserCoords = { lat, lng };
      setLocationSourceAuto();
      statusDiv.innerHTML = '<p class="text-sm font-bold text-emerald-600 bg-emerald-50 px-6 py-3 rounded-full inline-block mt-2 flex items-center gap-2"><span class="material-symbols-outlined animate-spin text-[16px]">sync</span> Location found. Analyzing environment...</p>';
      fetchEnvironmentData(lat, lng);
    },
    (error) => {
      console.warn("Geolocation Error:", error.message);
      statusDiv.innerHTML = '<p class="text-sm font-bold text-red-500 bg-red-50 px-6 py-3 rounded-full inline-block mt-2">Location access denied or failed.</p>';
      fallbackDiv.classList.remove('hidden');
    },
    { enableHighAccuracy: true, timeout: 10000 }
  );
}

function requestLocationForDashboard() {
  if (!navigator.geolocation) return;
  showDashboardLoading();
  navigator.geolocation.getCurrentPosition(
    (position) => {
      currentUserCoords = { lat: position.coords.latitude, lng: position.coords.longitude };
      setLocationSourceAuto();
      fetchEnvironmentData(currentUserCoords.lat, currentUserCoords.lng);
    },
    () => {
      hideDashboardLoading();
    },
    { enableHighAccuracy: true, timeout: 10000 }
  );
}

async function manualSearch(cityName) {
  const statusDiv = document.getElementById('location-status');
  statusDiv.innerHTML = '<p class="text-sm font-bold text-slate-500 animate-pulse bg-slate-100 px-6 py-3 rounded-full inline-block mt-2 flex items-center justify-center mx-auto gap-2"><span class="material-symbols-outlined animate-spin text-[16px]">sync</span> Searching coordinates for city...</p>';
  
  try {
    const res = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(cityName)}&format=json&limit=1`);
    const data = await res.json();
    if(data && data.length > 0) {
      statusDiv.innerHTML = '<p class="text-sm font-bold text-emerald-600 bg-emerald-50 px-6 py-3 rounded-full inline-block mt-2 mx-auto flex items-center justify-center gap-2"><span class="material-symbols-outlined animate-spin text-[16px]">sync</span> City found. Analyzing environment...</p>';
      fetchEnvironmentData(data[0].lat, data[0].lon);
    } else {
      statusDiv.innerHTML = '<p class="text-sm font-bold text-red-500 bg-red-50 px-6 py-3 rounded-full inline-block mt-2 mx-auto">City not found. Please try another name.</p>';
    }
  } catch(e) {
    statusDiv.innerHTML = '<p class="text-sm font-bold text-red-500 bg-red-50 px-6 py-3 rounded-full inline-block mt-2 mx-auto">Search failed.</p>';
  }
}

async function fetchEnvironmentData(lat, lng) {
  try {
    const res = await fetch(`/api/environment/forecast?lat=${lat}&lng=${lng}`);
    if(!res.ok) throw new Error("API failed");
    const data = await res.json();
    
    // Hide prompt, show dashboard
    document.getElementById('location-prompt').classList.add('hidden');
    
    const dash = document.getElementById('dashboard-content');
    dash.classList.remove('hidden');
    dash.classList.add('flex');
    
    hideDashboardLoading();
    renderDashboard(data);
  } catch (error) {
    console.error(error);
    hideDashboardLoading();
    const statusDiv = document.getElementById('location-status');
    statusDiv.innerHTML = '<p class="text-sm font-bold text-red-500 bg-red-50 px-6 py-3 rounded-full inline-block mt-2">Failed to fetch environmental data.</p>';
    document.getElementById('fallback-search').classList.remove('hidden');
  }
}

function showDashboardLoading() {
  const overlay = document.getElementById('dashboard-loading');
  if (overlay) overlay.classList.remove('hidden');
}

function hideDashboardLoading() {
  const overlay = document.getElementById('dashboard-loading');
  if (overlay) overlay.classList.add('hidden');
}

function renderDashboard(data) {
  // 1. Location
  document.getElementById('ui-city').textContent = data.location.city;
  document.getElementById('ui-region').textContent = `${data.location.district}, ${data.location.state}, ${data.location.country}`;

  // 2. Current Conditions
  const curr = data.current;
  const level = getAQILevel(curr.aqi);
  
  const aqiEl = document.getElementById('ui-aqi');
  aqiEl.textContent = curr.aqi;
  aqiEl.style.color = level.color;

  const catEl = document.getElementById('ui-aqi-cat');
  catEl.textContent = level.label;
  catEl.style.backgroundColor = level.color;
  catEl.style.color = '#fff';

  document.getElementById('ui-pm25').textContent = curr.pm25 || '--';
  document.getElementById('ui-pm10').textContent = curr.pm10 || '--';
  document.getElementById('ui-temp').textContent = curr.temperature || '--';
  document.getElementById('ui-humidity').textContent = curr.humidity || '--';
  document.getElementById('ui-wind').textContent = curr.wind_speed || '--';
  document.getElementById('ui-pressure').textContent = curr.pressure || '--';

  // 3. AI Insights
  const ai = data.ai_analysis;
  document.getElementById('ui-ai-analysis').innerHTML = ai.analysis_text;
  
  const trendEl = document.getElementById('ui-ai-trend');
  trendEl.textContent = ai.predicted_trend;
  if(ai.predicted_trend.toLowerCase() === 'improving') {
      trendEl.className = 'text-lg font-bold capitalize text-emerald-400';
  } else if(ai.predicted_trend.toLowerCase() === 'worsening') {
      trendEl.className = 'text-lg font-bold capitalize text-red-400';
  } else {
      trendEl.className = 'text-lg font-bold capitalize text-amber-400';
  }

  document.getElementById('ui-ai-confidence').textContent = ai.confidence;
  document.getElementById('ui-ai-health').textContent = ai.health_advisory;

  // 4. Render Charts
  renderAqiChart(data.historical, ai.hourly_forecast);
  renderWeatherChart(data.weather_forecast);
}

function renderAqiChart(historical, forecast) {
  const ctx = document.getElementById('aqi-chart').getContext('2d');
  
  // Prepare data: limit to last 24h historical + full forecast
  const hist = historical.slice(-24);
  
  const labels = [...hist.map(h => new Date(h.timestamp).toLocaleTimeString('en-IN', {hour: '2-digit', minute:'2-digit'})), 
                  ...forecast.map(f => new Date(f.timestamp).toLocaleTimeString('en-IN', {hour: '2-digit', minute:'2-digit'}))];
  
  const histData = [...hist.map(h => h.aqi), ...Array(forecast.length).fill(null)];
  
  // To make a continuous line, the first forecast point should overlap the last historical point
  const lastHistVal = hist.length > 0 ? hist[hist.length-1].aqi : 50;
  const foreData = [...Array(hist.length-1).fill(null), lastHistVal, ...forecast.map(f => f.predicted_aqi)];

  if (chartAqiInstance) chartAqiInstance.destroy();

  Chart.defaults.font.family = "'Satoshi', 'Inter', sans-serif";
  Chart.defaults.color = '#94a3b8';

  chartAqiInstance = new Chart(ctx, {
    type: 'line',
    data: {
      labels: labels,
      datasets: [
        {
          label: 'Observed US EPA AQI (Open-Meteo)',
          data: histData,
          borderColor: '#64748b',
          borderDash: [5, 5],
          tension: 0.4,
          borderWidth: 2,
          pointRadius: 0,
          pointHoverRadius: 6
        },
        {
          label: 'Predicted AQI (AI-Assisted Forecast)',
          data: foreData,
          borderColor: '#2563eb',
          backgroundColor: 'rgba(37, 99, 235, 0.1)',
          fill: true,
          tension: 0.4,
          borderWidth: 3,
          pointRadius: 0,
          pointHoverRadius: 6,
          pointBackgroundColor: '#2563eb'
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      plugins: {
        legend: { position: 'top', align: 'end', labels: { usePointStyle: true, boxWidth: 6, font: { size: 11, weight: '600' } } },
        tooltip: {
          backgroundColor: 'rgba(15, 23, 42, 0.9)',
          titleFont: { size: 12 },
          bodyFont: { size: 12, weight: 'bold' },
          padding: 10,
          cornerRadius: 8,
          displayColors: true,
          callbacks: {
            label: function(context) {
              if (context.raw !== null) {
                return ` ${context.dataset.label}: ${context.raw}`;
              }
            }
          }
        }
      },
      scales: {
        x: { grid: { display: false }, ticks: { maxTicksLimit: 12, font: { size: 10 } } },
        y: { beginAtZero: true, grid: { color: '#f1f5f9' }, border: { dash: [4, 4] } }
      }
    }
  });
}

function renderWeatherChart(weather_forecast) {
  const ctx = document.getElementById('weather-chart').getContext('2d');
  
  const labels = weather_forecast.map(w => new Date(w.timestamp).toLocaleTimeString('en-IN', {hour: '2-digit', minute:'2-digit'}));
  const temps = weather_forecast.map(w => w.temperature);
  const winds = weather_forecast.map(w => w.wind_speed);

  if (chartWeatherInstance) chartWeatherInstance.destroy();

  chartWeatherInstance = new Chart(ctx, {
    type: 'line',
    data: {
      labels: labels,
      datasets: [
        {
          label: 'Temperature (°C)',
          data: temps,
          borderColor: '#f59e0b',
          backgroundColor: 'rgba(245, 158, 11, 0.1)',
          yAxisID: 'y',
          tension: 0.4,
          fill: true,
          borderWidth: 2,
          pointRadius: 0,
          pointHoverRadius: 5
        },
        {
          label: 'Wind Speed (km/h)',
          data: winds,
          borderColor: '#06b6d4',
          yAxisID: 'y1',
          tension: 0.4,
          borderDash: [4, 4],
          borderWidth: 2,
          pointRadius: 0,
          pointHoverRadius: 5
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      plugins: {
        legend: { position: 'top', align: 'end', labels: { usePointStyle: true, boxWidth: 6, font: { size: 11, weight: '600' } } },
        tooltip: {
            backgroundColor: 'rgba(15, 23, 42, 0.9)',
            padding: 10,
            cornerRadius: 8
        }
      },
      scales: {
        x: { grid: { display: false }, ticks: { maxTicksLimit: 12, font: { size: 10 } } },
        y: { type: 'linear', display: true, position: 'left', grid: { color: '#f1f5f9' }, title: { display: true, text: 'Temp °C', font: {size: 10, weight: 'bold'} } },
        y1: { type: 'linear', display: true, position: 'right', grid: { drawOnChartArea: false }, title: { display: true, text: 'Wind km/h', font: {size: 10, weight: 'bold'} } }
      }
    }
  });
}
