// ============================================
// AeroStreet AI — Authentication Module
// ============================================
// Handles Firebase Auth for Citizen and Municipality roles.
// Provides login/signup modals and auth state management.

import { IS_DEMO_MODE } from './config.js';
import { getAuthInstance, getDb, COLLECTIONS } from './firebase-init.js';

// ── Auth State ──
/** @type {{ uid: string, email: string, displayName: string, role: 'citizen'|'municipality', photoURL: string } | null} */
let currentUser = null;
const authListeners = [];

/**
 * Subscribe to auth state changes
 * @param {(user: typeof currentUser) => void} callback
 */
export function onAuthChange(callback) {
  authListeners.push(callback);
  // Fire immediately with current state
  callback(currentUser);
}

function notifyAuthListeners() {
  authListeners.forEach(cb => cb(currentUser));
}

/**
 * Initialize auth state listener
 */
export async function initAuth() {
  if (IS_DEMO_MODE) {
    // Demo mode: simulate a logged-in citizen
    currentUser = {
      uid: 'demo-citizen-001',
      email: 'citizen@demo.aerostreet.ai',
      displayName: 'Demo Citizen',
      role: 'citizen',
      photoURL: '',
    };
    notifyAuthListeners();
    console.log('[Auth] Demo mode — logged in as Demo Citizen');
    return;
  }

  const auth = await getAuthInstance();
  if (!auth) return;

  const { onAuthStateChanged } = await import('https://www.gstatic.com/firebasejs/11.6.0/firebase-auth.js');

  onAuthStateChanged(auth, async (firebaseUser) => {
    if (firebaseUser) {
      // Fetch role from Firestore user profile
      const role = await getUserRole(firebaseUser.uid);
      currentUser = {
        uid: firebaseUser.uid,
        email: firebaseUser.email || '',
        displayName: firebaseUser.displayName || 'User',
        role: role,
        photoURL: firebaseUser.photoURL || '',
      };
    } else {
      currentUser = null;
    }
    notifyAuthListeners();
  });
}

/**
 * Get user role from Firestore
 * @param {string} uid
 * @returns {Promise<'citizen'|'municipality'>}
 */
async function getUserRole(uid) {
  try {
    const db = await getDb();
    if (!db) return 'citizen';
    const { doc, getDoc } = await import('https://www.gstatic.com/firebasejs/11.6.0/firebase-firestore.js');
    const userDoc = await getDoc(doc(db, COLLECTIONS.USERS, uid));
    return userDoc.exists() ? (userDoc.data().role || 'citizen') : 'citizen';
  } catch {
    return 'citizen';
  }
}

/**
 * Sign in with email and password
 * @param {string} email
 * @param {string} password
 * @param {'citizen'|'municipality'} role
 */
export async function signIn(email, password, role = 'citizen') {
  if (IS_DEMO_MODE) {
    currentUser = {
      uid: role === 'municipality' ? 'demo-muni-001' : 'demo-citizen-001',
      email: email,
      displayName: role === 'municipality' ? 'Municipal Officer' : 'Demo Citizen',
      role: role,
      photoURL: '',
    };
    notifyAuthListeners();
    return currentUser;
  }

  const auth = await getAuthInstance();
  const { signInWithEmailAndPassword } = await import('https://www.gstatic.com/firebasejs/11.6.0/firebase-auth.js');
  const credential = await signInWithEmailAndPassword(auth, email, password);
  return credential.user;
}

/**
 * Register a new citizen
 * @param {string} email
 * @param {string} password
 * @param {string} displayName
 */
export async function signUpCitizen(email, password, displayName) {
  if (IS_DEMO_MODE) {
    currentUser = {
      uid: 'demo-new-citizen-' + Date.now(),
      email, displayName, role: 'citizen', photoURL: '',
    };
    notifyAuthListeners();
    return currentUser;
  }

  const auth = await getAuthInstance();
  const db = await getDb();
  const { createUserWithEmailAndPassword, updateProfile } = await import('https://www.gstatic.com/firebasejs/11.6.0/firebase-auth.js');
  const { doc, setDoc, serverTimestamp } = await import('https://www.gstatic.com/firebasejs/11.6.0/firebase-firestore.js');

  const credential = await createUserWithEmailAndPassword(auth, email, password);
  await updateProfile(credential.user, { displayName });

  // Create user profile in Firestore
  await setDoc(doc(db, COLLECTIONS.USERS, credential.user.uid), {
    email, displayName, role: 'citizen',
    createdAt: serverTimestamp(),
  });

  return credential.user;
}

/**
 * Sign out
 */
export async function signOut() {
  if (IS_DEMO_MODE) {
    currentUser = null;
    notifyAuthListeners();
    return;
  }

  const auth = await getAuthInstance();
  const { signOut: fbSignOut } = await import('https://www.gstatic.com/firebasejs/11.6.0/firebase-auth.js');
  await fbSignOut(auth);
}

/** Get current user */
export function getCurrentUser() {
  return currentUser;
}

/** Check if user is municipality */
export function isMunicipality() {
  return currentUser?.role === 'municipality';
}

// ── Auth Modal UI ──

/**
 * Show the login/signup modal
 * @param {'login'|'signup'} mode
 */
export function showAuthModal(mode = 'login') {
  // Remove existing modal if any
  const existing = document.getElementById('auth-modal-overlay');
  if (existing) existing.remove();

  const isLogin = mode === 'login';

  const overlay = document.createElement('div');
  overlay.id = 'auth-modal-overlay';
  overlay.className = 'fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm';
  overlay.innerHTML = `
    <div class="bg-white rounded-card shadow-2xl border border-slate-200 w-full max-w-md mx-4 overflow-hidden animate-[fadeIn_0.2s_ease-out]">
      <!-- Header -->
      <div class="p-6 pb-4 border-b border-slate-100">
        <div class="flex items-center justify-between">
          <h2 class="text-lg font-bold text-slate-800">${isLogin ? 'Welcome Back' : 'Join AeroStreet AI'}</h2>
          <button id="auth-close-btn" class="w-8 h-8 rounded-full hover:bg-slate-100 flex items-center justify-center transition-colors">
            <span class="material-symbols-outlined text-slate-500">close</span>
          </button>
        </div>
        <p class="text-xs text-slate-400 mt-1">${isLogin ? 'Sign in to report issues and join community actions' : 'Create an account to start making a difference'}</p>
      </div>

      <!-- Form -->
      <form id="auth-form" class="p-6 space-y-4">
        ${!isLogin ? `
        <div>
          <label class="block text-[10px] font-bold text-slate-400 mb-1 uppercase tracking-wider">Full Name</label>
          <input id="auth-name" type="text" placeholder="Your name" required
            class="w-full px-4 py-2.5 rounded-lg border border-slate-200 bg-white text-slate-800 text-xs focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-colors" />
        </div>
        ` : ''}

        <div>
          <label class="block text-[10px] font-bold text-slate-400 mb-1 uppercase tracking-wider">Email</label>
          <input id="auth-email" type="email" placeholder="you@example.com" required
            class="w-full px-4 py-2.5 rounded-lg border border-slate-200 bg-white text-slate-800 text-xs focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-colors" />
        </div>

        <div>
          <label class="block text-[10px] font-bold text-slate-400 mb-1 uppercase tracking-wider">Password</label>
          <input id="auth-password" type="password" placeholder="••••••••" required minlength="6"
            class="w-full px-4 py-2.5 rounded-lg border border-slate-200 bg-white text-slate-800 text-xs focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-colors" />
        </div>

        ${isLogin ? `
        <div>
          <label class="block text-[10px] font-bold text-slate-400 mb-1 uppercase tracking-wider">Login As</label>
          <select id="auth-role" class="w-full px-4 py-2.5 rounded-lg border border-slate-200 bg-white text-slate-800 text-xs focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-colors">
            <option value="citizen">Citizen</option>
            <option value="municipality">Municipality Officer</option>
          </select>
        </div>
        ` : ''}

        <div id="auth-error" class="hidden text-red-600 text-xs bg-red-50 border border-red-100 p-3 rounded-lg"></div>

        <button type="submit" class="w-full py-2.5 bg-primary text-white font-semibold text-xs rounded-btn hover:bg-primary-hover transition-colors flex items-center justify-center gap-2">
          <span class="material-symbols-outlined text-[18px]">${isLogin ? 'login' : 'person_add'}</span>
          ${isLogin ? 'Sign In' : 'Create Account'}
        </button>
      </form>

      <!-- Footer toggle -->
      <div class="px-6 pb-6 text-center">
        <p class="text-xs text-slate-500">
          ${isLogin ? "Don't have an account?" : 'Already have an account?'}
          <button id="auth-toggle-btn" class="text-primary font-semibold hover:underline ml-1">
            ${isLogin ? 'Sign Up' : 'Sign In'}
          </button>
        </p>
      </div>
    </div>
  `;

  document.body.appendChild(overlay);

  // Event handlers
  document.getElementById('auth-close-btn').addEventListener('click', () => overlay.remove());
  overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });

  document.getElementById('auth-toggle-btn').addEventListener('click', () => {
    overlay.remove();
    showAuthModal(isLogin ? 'signup' : 'login');
  });

  document.getElementById('auth-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const errorDiv = document.getElementById('auth-error');
    errorDiv.classList.add('hidden');

    const email = document.getElementById('auth-email').value;
    const password = document.getElementById('auth-password').value;

    try {
      if (isLogin) {
        const role = document.getElementById('auth-role').value;
        await signIn(email, password, role);
      } else {
        const name = document.getElementById('auth-name').value;
        await signUpCitizen(email, password, name);
      }
      overlay.remove();
      window.__aerostreet?.showToast?.('Signed in successfully!', 'success');
    } catch (err) {
      errorDiv.textContent = err.message || 'Authentication failed. Please try again.';
      errorDiv.classList.remove('hidden');
    }
  });
}
