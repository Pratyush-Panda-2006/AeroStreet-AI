// ============================================
// IndianAQI — Google Maps Integration
// ============================================

import { getAQILevel } from './config.js';
import { DEMO_STATES, DEMO_DISTRICTS_BY_STATE, DEMO_HOTSPOTS } from './demo-data.js';
import { fetchLiveWebcams } from './webcams.js';

let mapInstance = null;
let currentMarkers = [];
let currentZoomedState = null;
let liveHotspots = [];
let onStateChangeCallback = null;
let mapContainerId = 'map-container';

export function registerOnStateChange(cb) {
  onStateChangeCallback = cb;
}

function loadGoogleMapsScript() {
  if (window.google && window.google.maps) return Promise.resolve();
  
  const apiKey = window.__AEROSTREET_CONFIG__?.googleMapsApiKey;
  if (!apiKey) {
    return Promise.reject(new Error("No Google Maps API Key provided."));
  }

  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`;
    script.async = true;
    script.defer = true;
    script.onload = resolve;
    script.onerror = () => reject(new Error("Failed to load Google Maps script."));
    document.head.appendChild(script);
  });
}

export async function initMap(containerId) {
  mapContainerId = containerId;
  const container = document.getElementById(containerId);
  if (!container) return false;

  container.innerHTML = '<div class="absolute inset-0 flex items-center justify-center text-sm text-slate-500"><span class="material-symbols-outlined animate-spin mr-2">progress_activity</span> Loading Google Maps...</div>';
  
  try {
    await loadGoogleMapsScript();
  } catch (err) {
    container.innerHTML = `<div class="p-4 text-center text-red-500 text-sm font-semibold">${err.message}</div>`;
    return false;
  }
  
  container.innerHTML = '<div id="gmap-inner" class="w-full h-full min-h-[450px] rounded-xl overflow-hidden shadow-sm"></div>';
  
  const mapStyle = [
    { elementType: "geometry", stylers: [{ color: "#f8fafc" }] },
    { elementType: "labels.text.stroke", stylers: [{ color: "#ffffff" }] },
    { elementType: "labels.text.fill", stylers: [{ color: "#475569" }] },
    { featureType: "water", elementType: "geometry", stylers: [{ color: "#e2e8f0" }] },
    { featureType: "road", elementType: "geometry", stylers: [{ color: "#f1f5f9" }] },
    { featureType: "administrative.country", elementType: "geometry.stroke", stylers: [{ color: "#cbd5e1" }] }
  ];

  mapInstance = new google.maps.Map(document.getElementById('gmap-inner'), {
    center: { lat: 21.5937, lng: 80.9629 }, // Center of India
    zoom: 4.8,
    styles: mapStyle,
    disableDefaultUI: true,
    zoomControl: true
  });

  liveHotspots = DEMO_HOTSPOTS;
  
  await renderNationalMap();
  
  return true;
}

function clearMapMarkers() {
  currentMarkers.forEach(m => m.setMap(null));
  currentMarkers = [];
}

export async function renderNationalMap() {
  if (!mapInstance) return;
  currentZoomedState = null;
  clearMapMarkers();
  
  mapInstance.setCenter({ lat: 21.5937, lng: 80.9629 });
  mapInstance.setZoom(4.8);

  // Render State markers
  DEMO_STATES.forEach(state => {
    if (!state.coordinates) return;
    const level = getAQILevel(state.aqi);
    
    const infoWindow = new google.maps.InfoWindow({
      content: `
        <div class="p-1 min-w-[120px]">
          <h3 class="font-bold text-slate-800 text-[13px]">${state.name}</h3>
          <p class="text-[11px] text-slate-500 mb-1">AQI: <span class="font-bold" style="color:${level.color}">${state.aqi}</span></p>
        </div>
      `
    });

    const marker = new google.maps.Marker({
      position: state.coordinates,
      map: mapInstance,
      icon: {
        path: google.maps.SymbolPath.CIRCLE,
        fillColor: level.color,
        fillOpacity: 0.8,
        strokeWeight: 1,
        strokeColor: '#ffffff',
        scale: 6
      },
      title: state.name
    });
    
    marker.addListener('mouseover', () => infoWindow.open(mapInstance, marker));
    marker.addListener('mouseout', () => infoWindow.close());
    marker.addListener('click', () => zoomToState(state.id));

    currentMarkers.push(marker);
  });

  // Render Live Webcams
  try {
    const webcams = await fetchLiveWebcams();
    webcams.forEach(cam => {
      const infoWindow = new google.maps.InfoWindow({
        content: `
          <div class="p-1 w-[200px]">
            <h3 class="font-bold text-slate-800 text-[11px] mb-1">${cam.title}</h3>
            <img src="${cam.image}" class="w-full h-auto rounded bg-slate-200" />
            <p class="text-[9px] text-slate-400 mt-1">Live Windy API Feed</p>
          </div>
        `
      });

      const marker = new google.maps.Marker({
        position: cam.coordinates,
        map: mapInstance,
        icon: {
          path: 'M12,2C6.48,2,2,6.48,2,12s4.48,10,10,10s10-4.48,10-10S17.52,2,12,2z M12,18c-3.31,0-6-2.69-6-6s2.69-6,6-6s6,2.69,6,6 S15.31,18,12,18z M12,8c-2.21,0-4,1.79-4,4s1.79,4,4,4s4-1.79,4-4S14.21,8,12,8z', // Camera lens icon
          fillColor: '#3b82f6',
          fillOpacity: 1,
          strokeWeight: 1,
          strokeColor: '#ffffff',
          scale: 0.8,
          anchor: new google.maps.Point(12, 12)
        },
        title: cam.title
      });
      
      marker.addListener('click', () => infoWindow.open(mapInstance, marker));
      currentMarkers.push(marker);
    });
  } catch (err) {
    console.warn("Failed to fetch webcams", err);
  }

  const backBtn = document.getElementById('map-back-btn');
  if (backBtn) backBtn.style.display = 'none';

  if (onStateChangeCallback) {
    onStateChangeCallback({ view: 'national', data: DEMO_STATES });
  }
}

export function zoomToState(stateId) {
  if (!mapInstance) return;
  
  const stateData = DEMO_STATES.find(s => s.id === stateId);
  if (!stateData || !stateData.coordinates) return;

  currentZoomedState = stateId;
  clearMapMarkers();

  mapInstance.setCenter(stateData.coordinates);
  mapInstance.setZoom(7);

  const districts = DEMO_DISTRICTS_BY_STATE[stateId] || [];

  districts.forEach(dist => {
    if (!dist.coordinates) return;
    const level = getAQILevel(dist.aqi);
    
    const infoWindow = new google.maps.InfoWindow({
      content: `
        <div class="p-1 min-w-[120px]">
          <h3 class="font-bold text-slate-800 text-[13px]">${dist.name}</h3>
          <p class="text-[10px] text-slate-400 mb-1">AQI: <span class="font-bold" style="color:${level.color}">${dist.aqi}</span></p>
        </div>
      `
    });

    const marker = new google.maps.Marker({
      position: dist.coordinates,
      map: mapInstance,
      icon: {
        path: google.maps.SymbolPath.CIRCLE,
        fillColor: level.color,
        fillOpacity: 0.9,
        strokeWeight: 1,
        strokeColor: '#ffffff',
        scale: 4
      },
      title: dist.name
    });
    
    marker.addListener('mouseover', () => infoWindow.open(mapInstance, marker));
    marker.addListener('mouseout', () => infoWindow.close());

    currentMarkers.push(marker);
  });

  let backBtn = document.getElementById('map-back-btn');
  if (!backBtn) {
    const container = document.getElementById(mapContainerId);
    backBtn = document.createElement('button');
    backBtn.id = 'map-back-btn';
    backBtn.className = 'absolute top-4 left-4 z-[10] px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-md border border-slate-700 transition-all cursor-pointer';
    backBtn.innerHTML = '<span class="material-symbols-outlined text-[16px]">arrow_back</span> Back to National Map';
    backBtn.onclick = renderNationalMap;
    container.style.position = 'relative';
    container.appendChild(backBtn);
  } else {
    backBtn.style.display = 'flex';
  }

  if (onStateChangeCallback) {
    onStateChangeCallback({ view: 'state', name: stateData.name, data: districts });
  }
}

export function clearMarkers() {
  clearMapMarkers();
}

export function getMap() {
  return mapInstance;
}
export const mapInitialized = true;
export function renderHotspotMarkers() {}
