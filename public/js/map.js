// ============================================
// IndianAQI — Google Maps Integration
// ============================================

import { getAQILevel } from './config.js';
import { DEMO_STATES, DEMO_DISTRICTS_BY_STATE, DEMO_HOTSPOTS } from './demo-data.js';
import { fetchLiveWebcams } from './webcams.js';
import { fetchLiveStations, fetchNearestAQI } from './aqi-api.js';

let mapContainerId = 'map-container';
let mapInstance = null;
let currentMarkers = [];
let currentZoomedState = null;
let liveHotspots = [];

let onStateChangeCallback = null;
export function registerOnStateChange(cb) {
  onStateChangeCallback = cb;
}

let googleMapsLoaded = false;
let googleMapsLoadPromise = null;

function loadGoogleMapsScript() {
  if (googleMapsLoaded) return Promise.resolve();
  if (googleMapsLoadPromise) return googleMapsLoadPromise;
  
  const apiKey = window.__AEROSTREET_CONFIG__?.googleMapsApiKey;
  if (!apiKey) {
    return Promise.reject(new Error("No Google Maps API key provided. Please configure it in .env"));
  }

  googleMapsLoadPromise = new Promise((resolve, reject) => {
    window.initGoogleMapCallback = () => {
      googleMapsLoaded = true;
      resolve();
    };
    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&callback=initGoogleMapCallback&libraries=places,geometry`;
    script.async = true;
    script.defer = true;
    script.onerror = () => reject(new Error("Failed to load Google Maps script."));
    document.head.appendChild(script);
  });
  
  return googleMapsLoadPromise;
}

const mapStyle = [
  { elementType: "geometry", stylers: [{ color: "#f8fafc" }] },
  { elementType: "labels.icon", stylers: [{ visibility: "off" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#64748b" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#f8fafc" }] },
  { featureType: "administrative", elementType: "geometry.stroke", stylers: [{ color: "#cbd5e1" }] },
  { featureType: "administrative.land_parcel", elementType: "labels.text.fill", stylers: [{ color: "#94a3b8" }] },
  { featureType: "poi", elementType: "geometry", stylers: [{ color: "#f1f5f9" }] },
  { featureType: "road", elementType: "geometry", stylers: [{ color: "#ffffff" }] },
  { featureType: "water", elementType: "geometry", stylers: [{ color: "#e2e8f0" }] }
];

export async function initMap(containerId) {
  mapContainerId = containerId;
  const container = document.getElementById(containerId);
  if (!container) return false;

  console.log('[Map] Initializing Google Maps');
  container.innerHTML = '<div class="absolute inset-0 flex items-center justify-center text-sm text-slate-500 font-sans"><span class="material-symbols-outlined animate-spin mr-2">progress_activity</span> Loading Google Maps...</div>';
  
  try {
    await loadGoogleMapsScript();
  } catch (err) {
    container.innerHTML = `<div class="p-4 text-center text-red-500 text-sm font-semibold">${err.message}</div>`;
    return false;
  }
  
  container.innerHTML = '<div id="gmap-inner" class="w-full h-full min-h-[450px] rounded-xl overflow-hidden shadow-sm"></div>';
  
  mapInstance = new google.maps.Map(document.getElementById('gmap-inner'), {
    center: { lat: 20.5937, lng: 78.9629 },
    zoom: 4.8,
    mapTypeId: 'hybrid',
    tilt: 45,
    disableDefaultUI: true,
    zoomControl: true,
  });

  const geocoder = new google.maps.Geocoder();
  const clickInfoWindow = new google.maps.InfoWindow();
  let tempMarker = null;

  mapInstance.addListener('click', async (e) => {
    const lat = e.latLng.lat();
    const lng = e.latLng.lng();

    if (tempMarker) tempMarker.setMap(null);
    clickInfoWindow.close();

    tempMarker = new google.maps.Marker({
      position: { lat, lng },
      map: mapInstance,
      animation: google.maps.Animation.DROP,
    });

    try {
      const gcRes = await geocoder.geocode({ location: { lat, lng } });
      const comps = gcRes.results[0]?.address_components || [];
      const placeName = comps.find(c => c.types.includes('locality'))?.long_name 
                     || comps.find(c => c.types.includes('administrative_area_level_2'))?.long_name
                     || comps.find(c => c.types.includes('administrative_area_level_3'))?.long_name
                     || 'Selected Location';

      const aqiData = await fetchNearestAQI(lat, lng);
      const apiKey = window.__AEROSTREET_CONFIG__?.googleMapsApiKey || '';
      const areaImageUrl = `https://maps.googleapis.com/maps/api/staticmap?center=${lat},${lng}&zoom=15&size=300x200&maptype=satellite&key=${apiKey}`;
      
      const aqiVal = aqiData ? aqiData.aqi : 'N/A';
      const level = getAQILevel(aqiVal === 'N/A' ? 50 : aqiVal);

      clickInfoWindow.setContent(`
        <div class="p-2 min-w-[200px] font-sans">
          <h3 class="font-bold text-slate-800 text-[14px]">📍 ${placeName}</h3>
          <p class="text-[10px] text-slate-500 mb-2">Nearest station: ${aqiData ? aqiData.stationName : 'None nearby'}</p>
          <img src="${areaImageUrl}" alt="Satellite view" class="w-full h-auto rounded shadow-sm border border-slate-200 mb-2" />
          <p class="text-xs">Estimated AQI: <span class="font-bold text-lg" style="color:${level.color}">${aqiVal}</span></p>
        </div>
      `);
      clickInfoWindow.open(mapInstance, tempMarker);
    } catch (err) {
      console.error('Click-to-inspect error:', err);
    }
  });

  liveHotspots = DEMO_HOTSPOTS;
  renderNationalMap();
  return true;
}

function clearMapMarkers() {
  currentMarkers.forEach(m => m.setMap(null));
  currentMarkers = [];
}

export function renderNationalMap() {
  if (!mapInstance) return;
  currentZoomedState = null;
  clearMapMarkers();
  
  mapInstance.panTo({ lat: 21.5937, lng: 80.9629 });
  mapInstance.setZoom(5);

  const infowindow = new google.maps.InfoWindow();

  // Render State markers
  DEMO_STATES.forEach(state => {
    if (!state.coordinates) return;
    const level = getAQILevel(state.aqi);
    
    const marker = new google.maps.Marker({
      position: state.coordinates,
      map: mapInstance,
      icon: {
        path: google.maps.SymbolPath.CIRCLE,
        scale: 8,
        fillColor: level.color,
        fillOpacity: 0.8,
        strokeWeight: 2,
        strokeColor: "#ffffff"
      },
      title: state.name
    });
    
    marker.addListener('click', () => {
      zoomToState(state.id);
    });

    marker.addListener('mouseover', () => {
      infowindow.setContent(`
        <div class="p-2 min-w-[140px] font-sans">
          <h3 class="font-bold text-slate-800 text-[13px]">${state.name}</h3>
          <p class="text-[11px] text-slate-500 mb-2">AQI: <span class="font-bold" style="color:${level.color}">${state.aqi}</span></p>
          <div class="text-[10px] text-blue-600 font-semibold">🖱 Click to view districts</div>
        </div>
      `);
      infowindow.open(mapInstance, marker);
    });
    
    marker.addListener('mouseout', () => {
      infowindow.close();
    });

    currentMarkers.push(marker);
  });

  // Render Hotspots with pulsing effect representation
  liveHotspots.forEach(hotspot => {
    if (!hotspot.coordinates) return;
    const level = getAQILevel(hotspot.aqi);
    const marker = new google.maps.Marker({
      position: hotspot.coordinates,
      map: mapInstance,
      icon: {
        url: "data:image/svg+xml;charset=UTF-8," + encodeURIComponent(`
          <svg width="32" height="32" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
            <circle cx="16" cy="16" r="14" fill="${level.color}" opacity="0.25" />
            <circle cx="16" cy="16" r="6" fill="${level.color}" stroke="#fff" stroke-width="2" />
          </svg>
        `),
        scaledSize: new google.maps.Size(32, 32),
        anchor: new google.maps.Point(16, 16)
      },
      title: hotspot.name,
      zIndex: 100
    });
    
    marker.addListener('click', () => {
      infowindow.setContent(`
        <div class="p-2 font-sans max-w-[200px]">
          <h3 class="font-bold text-slate-800 text-[13px]">${hotspot.name}</h3>
          <p class="text-[10px] text-slate-500 font-mono uppercase tracking-wider">${hotspot.source === 'CCTV_Alert' ? 'CCTV Alert' : 'Sensor Hotspot'}</p>
          <p class="font-bold mt-1.5 text-xs" style="color:${level.color}">AQI ${hotspot.aqi}</p>
          <div class="mt-2 space-y-1 text-[11px] text-slate-600">
            ${(hotspot.pollutants || []).map(p => `<div><span class="font-semibold">${p.name}:</span> ${p.value} ${p.unit}</div>`).join('')}
          </div>
        </div>
      `);
      infowindow.open(mapInstance, marker);
    });
    currentMarkers.push(marker);
  });

  // Render Windy Webcams (Live Feeds)
  fetchLiveWebcams().then(webcams => {
    webcams.forEach(cam => {
      if (!cam.location) return;
      const marker = new google.maps.Marker({
        position: { lat: cam.location.latitude, lng: cam.location.longitude },
        map: mapInstance,
        icon: {
          url: "data:image/svg+xml;charset=UTF-8," + encodeURIComponent(`
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#2563eb" stroke-width="2" xmlns="http://www.w3.org/2000/svg">
              <path d="M15.6 11.6L22 7v10l-6.4-4.5v-1z"></path>
              <rect x="2" y="5" width="14" height="14" rx="2" ry="2" fill="#fff"></rect>
            </svg>
          `),
          scaledSize: new google.maps.Size(24, 24),
          anchor: new google.maps.Point(12, 12)
        },
        title: cam.title,
        zIndex: 50
      });
      
      marker.addListener('click', () => {
        const imageUrl = cam.images?.current?.preview || '';
        infowindow.setContent(`
          <div class="p-2 font-sans max-w-[250px]">
            <h3 class="font-bold text-slate-800 text-[13px] truncate">${cam.title}</h3>
            <p class="text-[10px] text-slate-500 font-mono uppercase tracking-wider mb-2">Live Traffic / Weather Cam</p>
            ${imageUrl ? `<img src="${imageUrl}" class="w-full h-auto rounded shadow-sm border border-slate-100" />` : '<div class="p-4 text-center bg-slate-50 text-xs text-slate-400">No image preview available</div>'}
          </div>
        `);
        infowindow.open(mapInstance, marker);
      });
      currentMarkers.push(marker);
    });
  });

  const backBtn = document.getElementById('map-back-btn');
  if (backBtn) backBtn.style.display = 'none';

  if (onStateChangeCallback) {
    onStateChangeCallback({ view: 'national', data: DEMO_STATES });
  }
}

export async function zoomToState(stateId) {
  if (!mapInstance) return;
  
  const stateData = DEMO_STATES.find(s => s.id === stateId);
  if (!stateData || !stateData.coordinates) return;

  currentZoomedState = stateId;
  clearMapMarkers();

  mapInstance.panTo(stateData.coordinates);
  mapInstance.setZoom(7);

  const infowindow = new google.maps.InfoWindow();
  
  let districts = await fetchLiveStations(stateData.coordinates.lat, stateData.coordinates.lng);
  if (!districts) {
    districts = DEMO_DISTRICTS_BY_STATE[stateId] || [];
  }

  districts.forEach(dist => {
    if (!dist.coordinates) return;
    const level = getAQILevel(dist.aqi);
    
    const marker = new google.maps.Marker({
      position: dist.coordinates,
      map: mapInstance,
      icon: {
        path: google.maps.SymbolPath.CIRCLE,
        scale: 6,
        fillColor: level.color,
        fillOpacity: 0.9,
        strokeWeight: 1.5,
        strokeColor: "#ffffff"
      },
      title: dist.name
    });

    marker.addListener('click', () => {
      const apiKey = window.__AEROSTREET_CONFIG__?.googleMapsApiKey || '';
      const areaImageUrl = `https://maps.googleapis.com/maps/api/staticmap?center=${dist.coordinates.lat},${dist.coordinates.lng}&zoom=15&size=300x200&maptype=satellite&key=${apiKey}`;
      
      infowindow.setContent(`
        <div class="p-2 min-w-[200px] font-sans">
          <h3 class="font-bold text-slate-800 text-[14px]">${dist.name}</h3>
          <p class="text-[11px] text-slate-400 mb-2">District in ${stateData.name}</p>
          <img src="${areaImageUrl}" alt="${dist.name} satellite view" class="w-full h-auto rounded shadow-sm border border-slate-200 mb-2" />
          <p class="text-xs">Current AQI: <span class="font-bold text-lg" style="color:${level.color}">${dist.aqi}</span></p>
          <div class="mt-1 flex flex-wrap gap-1">
            ${(dist.pollutants || []).map(p => `<span class="bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded text-[10px]">${p.name}: ${p.value}</span>`).join('')}
          </div>
        </div>
      `);
      infowindow.open(mapInstance, marker);
    });

    currentMarkers.push(marker);
  });

  // Inject a back button dynamically if not exists
  let backBtn = document.getElementById('map-back-btn');
  if (!backBtn) {
    const container = document.getElementById(mapContainerId);
    backBtn = document.createElement('button');
    backBtn.id = 'map-back-btn';
    backBtn.className = 'absolute top-4 left-4 z-[100] px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-md border border-slate-700 transition-all cursor-pointer';
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
