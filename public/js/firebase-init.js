// ============================================
// AeroStreet AI — Firebase Initialization
// ============================================
// Initializes Firebase App, Firestore, Auth, and Storage.
// Falls back to demo stubs if in demo mode.

import { FIREBASE_CONFIG, IS_DEMO_MODE } from './config.js';

/** @type {import('firebase/app').FirebaseApp | null} */
let app = null;
/** @type {import('firebase/firestore').Firestore | null} */
let db = null;
/** @type {import('firebase/auth').Auth | null} */
let auth = null;
/** @type {import('firebase/storage').FirebaseStorage | null} */
let storage = null;

let firebaseReady = false;

// ── Collection names ──
export const COLLECTIONS = {
  HOTSPOTS:          'hotspots',
  REPORTS:           'reports',
  COMMUNITY_EVENTS:  'community_events',
  AI_RECOMMENDATIONS:'ai_recommendations',
  CCTV_ALERTS:       'cctv_alerts',
  USERS:             'users',
  AQI_DATA:          'aqi_data',
};

/**
 * Initialize Firebase (lazy, called once)
 */
async function initFirebase() {
  if (firebaseReady) return;

  if (IS_DEMO_MODE) {
    console.log('[Firebase] Demo mode — using mock data layer');
    firebaseReady = true;
    return;
  }

  try {
    const { initializeApp } = await import('https://www.gstatic.com/firebasejs/11.6.0/firebase-app.js');
    const { getFirestore }  = await import('https://www.gstatic.com/firebasejs/11.6.0/firebase-firestore.js');
    const { getAuth }       = await import('https://www.gstatic.com/firebasejs/11.6.0/firebase-auth.js');
    const { getStorage }    = await import('https://www.gstatic.com/firebasejs/11.6.0/firebase-storage.js');

    app     = initializeApp(FIREBASE_CONFIG);
    db      = getFirestore(app);
    auth    = getAuth(app);
    storage = getStorage(app);

    firebaseReady = true;
    console.log('[Firebase] Initialized successfully');
  } catch (err) {
    console.error('[Firebase] Initialization failed:', err);
    console.log('[Firebase] Falling back to demo mode');
    firebaseReady = true;
  }
}

/** Get Firestore instance (initializes if needed) */
export async function getDb() {
  await initFirebase();
  return db;
}

/** Get Auth instance */
export async function getAuthInstance() {
  await initFirebase();
  return auth;
}

/** Get Storage instance */
export async function getStorageInstance() {
  await initFirebase();
  return storage;
}

/** Check if Firebase is available (not demo) */
export function isFirebaseAvailable() {
  return !IS_DEMO_MODE && db !== null;
}

// Auto-initialize on import
initFirebase();

export { app, db, auth, storage };
