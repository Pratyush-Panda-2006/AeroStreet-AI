// ============================================
// AeroStreet AI — Citizen Quick-Report Pipeline
// ============================================
// Track 1: Handles citizen issue submission to Firestore
// with coordinates, category, image, and status tracking.

import { IS_DEMO_MODE, REPORT_CATEGORIES } from './config.js';
import { getDb, getStorageInstance, COLLECTIONS, isFirebaseAvailable } from './firebase-init.js';
import { getCurrentUser } from './auth.js';

/**
 * Submit a citizen report
 * @param {{ category: string, description: string, imageFile: File|null, coordinates: { lat: number, lng: number } }} reportData
 * @returns {Promise<{ id: string, success: boolean }>}
 */
export async function submitReport({ category, description, imageFile, coordinates }) {
  // Free for everyone: default to guest citizen if not authenticated
  const user = getCurrentUser() || { uid: 'guest-citizen-' + Math.random().toString(36).substr(2, 9), displayName: 'Guest Citizen' };

  try {
    const formData = new FormData();
    formData.append('category', category);
    formData.append('description', description);
    formData.append('lat', coordinates.lat);
    formData.append('lng', coordinates.lng);
    formData.append('userId', user.uid);
    formData.append('userName', user.displayName);
    if (imageFile) {
      formData.append('image', imageFile);
    }

    const response = await fetch('/api/reports', {
      method: 'POST',
      body: formData
    });

    if (response.ok) {
      const result = await response.json();
      if (result.success && result.report) {
        // Dispatch custom event to notify municipality hub of new report
        window.dispatchEvent(new CustomEvent('report-submitted', { detail: { report: result.report } }));
        return { id: result.report.id, success: true };
      }
    }
  } catch (err) {
    console.warn('[Reports] Express API submission failed, using Firebase or local fallback:', err.message);
  }

  let imageUrl = '';

  // Upload image if provided
  if (imageFile && isFirebaseAvailable()) {
    imageUrl = await uploadReportImage(imageFile, user.uid);
  } else if (imageFile) {
    // Demo mode: use a placeholder URL or dataURL
    imageUrl = await new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target.result);
      reader.readAsDataURL(imageFile);
    });
  }

  const report = {
    userId: user.uid,
    userName: user.displayName,
    category,
    description,
    imageUrl,
    coordinates: {
      lat: coordinates.lat,
      lng: coordinates.lng,
    },
    status: 'Pending',
    source: 'citizen',
    createdAt: new Date().toISOString(),
  };

  if (isFirebaseAvailable()) {
    const db = await getDb();
    const { collection, addDoc, serverTimestamp } = await import('https://www.gstatic.com/firebasejs/11.6.0/firebase-firestore.js');
    report.createdAt = serverTimestamp();
    const docRef = await addDoc(collection(db, COLLECTIONS.REPORTS), report);
    console.log('[Reports] Submitted report:', docRef.id);
    return { id: docRef.id, success: true };
  }

  // Demo mode
  const demoId = 'demo-report-' + Date.now();
  const timeString = new Date().toLocaleTimeString('en-IN', { hour12: false });
  const mockReport = {
    id: `👤 User #${demoId.slice(-3)}`,
    type: category.charAt(0).toUpperCase() + category.slice(1) + ' Pollution',
    location: description.slice(0, 30) + '...',
    confidence: 'N/A',
    status: 'Warning Active',
    time: timeString,
    source: 'citizen',
    description: description,
    imageUrl: imageUrl,
    coordinates: { lat: coordinates.lat, lng: coordinates.lng }
  };
  window.dispatchEvent(new CustomEvent('report-submitted', { detail: { report: mockReport } }));
  console.log('[Reports] Demo report submitted:', demoId, mockReport);
  return { id: demoId, success: true };
}

/**
 * Upload report image to Firebase Storage
 * @param {File} file
 * @param {string} userId
 * @returns {Promise<string>} Download URL
 */
async function uploadReportImage(file, userId) {
  const storageInstance = await getStorageInstance();
  const { ref, uploadBytes, getDownloadURL } = await import('https://www.gstatic.com/firebasejs/11.6.0/firebase-storage.js');
  const fileName = `reports/${userId}/${Date.now()}_${file.name}`;
  const storageRef = ref(storageInstance, fileName);
  const snapshot = await uploadBytes(storageRef, file);
  return getDownloadURL(snapshot.ref);
}

/**
 * Get reports filtered by status
 * @param {string} [status] - 'Pending', 'In Progress', 'Resolved'
 * @returns {Promise<Array>}
 */
export async function getReportsByStatus(status) {
  if (!isFirebaseAvailable()) {
    return getDemoReports().filter(r => !status || r.status === status);
  }

  try {
    const db = await getDb();
    const { collection, query, where, orderBy, getDocs } = await import('https://www.gstatic.com/firebasejs/11.6.0/firebase-firestore.js');

    let q;
    if (status) {
      q = query(
        collection(db, COLLECTIONS.REPORTS),
        where('status', '==', status),
        orderBy('createdAt', 'desc')
      );
    } else {
      q = query(collection(db, COLLECTIONS.REPORTS), orderBy('createdAt', 'desc'));
    }

    const timeout = new Promise((_, reject) => setTimeout(() => reject(new Error('Firestore Timeout')), 2500));
    const snapshot = await Promise.race([
      getDocs(q),
      timeout
    ]);

    if (snapshot.empty) {
      return getDemoReports().filter(r => !status || r.status === status);
    }

    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (err) {
    console.warn('[Reports] Query failed or timed out, using fallback demo reports', err.message);
    return getDemoReports().filter(r => !status || r.status === status);
  }
}

/**
 * Update report status (municipality action)
 * @param {string} reportId
 * @param {string} newStatus
 */
export async function updateReportStatus(reportId, newStatus) {
  if (!isFirebaseAvailable()) {
    console.log(`[Reports] Demo: Updated ${reportId} to ${newStatus}`);
    return;
  }

  const db = await getDb();
  const { doc, updateDoc, serverTimestamp } = await import('https://www.gstatic.com/firebasejs/11.6.0/firebase-firestore.js');
  await updateDoc(doc(db, COLLECTIONS.REPORTS, reportId), {
    status: newStatus,
    updatedAt: serverTimestamp(),
  });
}

/**
 * Get current user's coordinates via browser Geolocation API
 * @returns {Promise<{ lat: number, lng: number }>}
 */
export function getCurrentLocation() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      // Default to Delhi
      resolve({ lat: 28.6139, lng: 77.2090 });
      return;
    }
    navigator.geolocation.getCurrentPosition(
      pos => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => resolve({ lat: 28.6139, lng: 77.2090 }),
      { timeout: 10000 }
    );
  });
}

// ── Report Modal UI ──

/**
 * Show the quick-report modal
 */
export function showReportModal() {
  const existing = document.getElementById('report-modal-overlay');
  if (existing) existing.remove();

  const categoryOptions = REPORT_CATEGORIES.map(c =>
    `<option value="${c.id}">${c.label}</option>`
  ).join('');

  const overlay = document.createElement('div');
  overlay.id = 'report-modal-overlay';
  overlay.className = 'fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm';
  overlay.innerHTML = `
    <div class="bg-white rounded-card shadow-2xl border border-slate-200 w-full max-w-lg mx-4 overflow-hidden animate-[fadeIn_0.2s_ease-out]">
      <!-- Header -->
      <div class="p-6 pb-4 border-b border-slate-100 bg-gradient-to-r from-blue-50/20 to-transparent">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center">
              <span class="material-symbols-outlined text-primary">report</span>
            </div>
            <div>
              <h2 class="text-lg font-bold text-slate-800">Quick Report</h2>
              <p class="text-xs text-slate-400">Report a pollution issue in your area</p>
            </div>
          </div>
          <button id="report-close-btn" class="w-8 h-8 rounded-full hover:bg-slate-100 flex items-center justify-center transition-colors">
            <span class="material-symbols-outlined text-slate-500">close</span>
          </button>
        </div>
      </div>

      <!-- Form -->
      <form id="report-form" class="p-6 space-y-4">
        <div>
          <label class="block text-[10px] font-bold text-slate-400 mb-1 uppercase tracking-wider">Category</label>
          <select id="report-category" required
            class="w-full px-4 py-2.5 rounded-lg border border-slate-200 bg-white text-slate-800 text-xs focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-colors">
            <option value="">Select a category...</option>
            ${categoryOptions}
          </select>
        </div>

        <div>
          <label class="block text-[10px] font-bold text-slate-400 mb-1 uppercase tracking-wider">Description</label>
          <textarea id="report-description" rows="3" placeholder="Describe the issue you've observed..." required
            class="w-full px-4 py-2.5 rounded-lg border border-slate-200 bg-white text-slate-800 text-xs focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-colors resize-none"></textarea>
        </div>

        <div>
          <label class="block text-[10px] font-bold text-slate-400 mb-1 uppercase tracking-wider">Photo Evidence (Optional)</label>
          <div id="report-upload-area" class="border-2 border-dashed border-slate-200 rounded-lg p-6 text-center hover:border-primary/50 transition-colors cursor-pointer">
            <span class="material-symbols-outlined text-slate-300 text-3xl mb-2">add_a_photo</span>
            <p class="text-xs text-slate-400">Click or drag an image here</p>
            <input id="report-image" type="file" accept="image/*" class="hidden" />
          </div>
          <div id="report-image-preview" class="hidden mt-2 relative">
            <img id="report-preview-img" class="w-full h-32 object-cover rounded-lg" />
            <button type="button" id="report-remove-image" class="absolute top-1 right-1 w-6 h-6 bg-error text-white rounded-full flex items-center justify-center text-xs">✕</button>
          </div>
        </div>

        <div id="report-detect-location" class="flex items-center gap-2 p-3 bg-slate-50 hover:bg-slate-100 border border-slate-200/50 rounded-lg cursor-pointer transition-colors" title="Click to refresh device location coordinates">
          <span class="material-symbols-outlined text-primary text-sm">my_location</span>
          <span id="report-location-text" class="text-xs text-slate-500">Detecting your location...</span>
        </div>

        <div id="report-error" class="hidden text-red-600 text-xs bg-red-50 border border-red-100 p-3 rounded-lg"></div>

        <button type="submit" id="report-submit-btn" class="w-full py-2.5 bg-primary hover:bg-primary-hover text-white rounded-btn text-xs font-semibold transition-colors flex items-center justify-center gap-2">
          <span class="material-symbols-outlined text-[18px]">send</span>
          Submit Report
        </button>
      </form>
    </div>
  `;

  document.body.appendChild(overlay);

  // Auto-detect location
  let reportCoordinates = { lat: 28.6139, lng: 77.2090 };
  getCurrentLocation().then(coords => {
    reportCoordinates = coords;
    const locText = document.getElementById('report-location-text');
    if (locText) locText.textContent = `Location: ${coords.lat.toFixed(4)}, ${coords.lng.toFixed(4)}`;
  });

  // Manual location click detection
  const locationBtn = document.getElementById('report-detect-location');
  locationBtn.addEventListener('click', () => {
    const locText = document.getElementById('report-location-text');
    locText.textContent = 'Querying device Geolocation API...';
    getCurrentLocation().then(coords => {
      reportCoordinates = coords;
      locText.textContent = `Location: ${coords.lat.toFixed(4)}, ${coords.lng.toFixed(4)}`;
      window.__aerostreet?.showToast?.('Device coordinates updated successfully!', 'success');
    }).catch(() => {
      locText.textContent = 'Delhi (Default): 28.6139, 77.2090';
    });
  });

  // Image upload handling
  const uploadArea = document.getElementById('report-upload-area');
  const imageInput = document.getElementById('report-image');
  const previewContainer = document.getElementById('report-image-preview');
  const previewImg = document.getElementById('report-preview-img');

  uploadArea.addEventListener('click', () => imageInput.click());

  // Drag and Drop support
  uploadArea.addEventListener('dragover', (e) => {
    e.preventDefault();
    uploadArea.classList.add('border-primary', 'bg-blue-50/20');
  });

  uploadArea.addEventListener('dragleave', () => {
    uploadArea.classList.remove('border-primary', 'bg-blue-50/20');
  });

  uploadArea.addEventListener('drop', (e) => {
    e.preventDefault();
    uploadArea.classList.remove('border-primary', 'bg-blue-50/20');
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) {
      imageInput.files = e.dataTransfer.files;
      const reader = new FileReader();
      reader.onload = (ev) => {
        previewImg.src = ev.target.result;
        previewContainer.classList.remove('hidden');
        uploadArea.classList.add('hidden');
      };
      reader.readAsDataURL(file);
      window.__aerostreet?.showToast?.('Image evidence attached successfully!', 'info');
    }
  });

  imageInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        previewImg.src = ev.target.result;
        previewContainer.classList.remove('hidden');
        uploadArea.classList.add('hidden');
      };
      reader.readAsDataURL(file);
      window.__aerostreet?.showToast?.('Image evidence attached successfully!', 'info');
    }
  });

  document.getElementById('report-remove-image')?.addEventListener('click', () => {
    imageInput.value = '';
    previewContainer.classList.add('hidden');
    uploadArea.classList.remove('hidden');
  });

  // Close handlers
  document.getElementById('report-close-btn').addEventListener('click', () => overlay.remove());
  overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });

  // Submit
  document.getElementById('report-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const errorDiv = document.getElementById('report-error');
    const submitBtn = document.getElementById('report-submit-btn');
    errorDiv.classList.add('hidden');
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<span class="material-symbols-outlined text-[18px] animate-spin">progress_activity</span> Submitting...';

    try {
      const result = await submitReport({
        category: document.getElementById('report-category').value,
        description: document.getElementById('report-description').value,
        imageFile: imageInput.files[0] || null,
        coordinates: reportCoordinates,
      });

      overlay.remove();
      window.__aerostreet?.showToast?.('Report submitted successfully! ID: ' + result.id, 'success');
    } catch (err) {
      errorDiv.textContent = err.message;
      errorDiv.classList.remove('hidden');
      submitBtn.disabled = false;
      submitBtn.innerHTML = '<span class="material-symbols-outlined text-[18px]">send</span> Submit Report';
    }
  });
}

/** Demo reports for fallback */
function getDemoReports() {
  return [
    { id: 'dr-1', category: 'smoke', description: 'Heavy industrial smoke from factory near MG Road', status: 'Pending', coordinates: { lat: 28.6139, lng: 77.2090 }, userName: 'Ravi K.', createdAt: '2026-07-05T06:30:00Z' },
    { id: 'dr-2', category: 'litter', description: 'Illegal dumping near riverbank', status: 'In Progress', coordinates: { lat: 19.0760, lng: 72.8777 }, userName: 'Priya M.', createdAt: '2026-07-04T14:00:00Z' },
    { id: 'dr-3', category: 'burning', description: 'Open waste burning in residential area', status: 'Resolved', coordinates: { lat: 12.9716, lng: 77.5946 }, userName: 'Arjun S.', createdAt: '2026-07-03T09:15:00Z' },
    { id: 'dr-4', category: 'dust', description: 'Construction site without water sprinklers causing dust', status: 'Pending', coordinates: { lat: 28.4595, lng: 77.0266 }, userName: 'Neha G.', createdAt: '2026-07-05T08:00:00Z' },
  ];
}
