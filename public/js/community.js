// ============================================
// AeroStreet AI — Community Events & RSVP
// ============================================
// Track 1: Community action event creation,
// RSVP tracking with real-time slot counters.

import { IS_DEMO_MODE } from './config.js';
import { getDb, COLLECTIONS, isFirebaseAvailable } from './firebase-init.js';
import { getCurrentUser, isMunicipality } from './auth.js';

// ── Demo Events Data ──
const DEMO_EVENTS = [
  {
    id: 'evt-1',
    title: 'River Yamuna Cleanup Drive',
    description: 'Join us for a community cleanup along the Yamuna riverbank. Gloves and bags provided.',
    date: '2026-07-12T07:00:00Z',
    location: 'Yamuna Ghat, Delhi',
    coordinates: { lat: 28.6328, lng: 77.2197 },
    maxSlots: 50,
    slotsFilled: 34,
    attendees: [],
    createdBy: 'Municipality of Delhi',
    category: 'cleanup',
  },
  {
    id: 'evt-2',
    title: 'Tree Plantation — Green Bengaluru',
    description: 'Plant 500 saplings across Cubbon Park. Refreshments and certificates for participants.',
    date: '2026-07-15T06:30:00Z',
    location: 'Cubbon Park, Bangalore',
    coordinates: { lat: 12.9763, lng: 77.5929 },
    maxSlots: 100,
    slotsFilled: 78,
    attendees: [],
    createdBy: 'BBMP Green Initiative',
    category: 'plantation',
  },
  {
    id: 'evt-3',
    title: 'Air Quality Awareness Workshop',
    description: 'Learn about AQI monitoring, health impacts, and what you can do to reduce pollution.',
    date: '2026-07-20T10:00:00Z',
    location: 'Town Hall, Pune',
    coordinates: { lat: 18.5204, lng: 73.8567 },
    maxSlots: 30,
    slotsFilled: 12,
    attendees: [],
    createdBy: 'PMC Environment Dept',
    category: 'workshop',
  },
];

/**
 * Get upcoming community events
 * @returns {Promise<Array>}
 */
export async function getUpcomingEvents() {
  if (!isFirebaseAvailable()) {
    return DEMO_EVENTS;
  }

  try {
    const db = await getDb();
    const { collection, query, where, orderBy, getDocs } = await import('https://www.gstatic.com/firebasejs/11.6.0/firebase-firestore.js');

    const q = query(
      collection(db, COLLECTIONS.COMMUNITY_EVENTS),
      where('date', '>=', new Date().toISOString()),
      orderBy('date', 'asc')
    );

    const timeout = new Promise((_, reject) => setTimeout(() => reject(new Error('Firestore Timeout')), 2500));
    const snapshot = await Promise.race([
      getDocs(q),
      timeout
    ]);

    if (snapshot.empty) {
      console.log('[Community] No database community events found, using fallback demo data');
      return DEMO_EVENTS;
    }

    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (err) {
    console.warn('[Community] Upcoming events query failed or timed out, using fallback demo data', err.message);
    return DEMO_EVENTS;
  }
}

/**
 * RSVP to an event (allows guests to participate)
 * @param {string} eventId
 * @returns {Promise<{ slotsFilled: number, success: boolean }>}
 */
export async function rsvpEvent(eventId) {
  // Free for everyone: default to guest user if not authenticated
  const user = getCurrentUser() || { uid: 'guest-user-' + Math.random().toString(36).substr(2, 9), displayName: 'Anonymous Volunteer' };

  if (!isFirebaseAvailable()) {
    const event = DEMO_EVENTS.find(e => e.id === eventId);
    if (event) {
      if (event.slotsFilled >= event.maxSlots) throw new Error('Event is full!');
      event.slotsFilled++;
      event.attendees = event.attendees || [];
      event.attendees.push(user.uid);
    }
    console.log(`[Community] Demo RSVP for event ${eventId}`);
    return { slotsFilled: event?.slotsFilled || 0, success: true };
  }

  const db = await getDb();
  const { doc, runTransaction, arrayUnion } = await import('https://www.gstatic.com/firebasejs/11.6.0/firebase-firestore.js');

  const eventRef = doc(db, COLLECTIONS.COMMUNITY_EVENTS, eventId);

  const result = await runTransaction(db, async (transaction) => {
    const eventDoc = await transaction.get(eventRef);
    if (!eventDoc.exists()) throw new Error('Event not found');

    const data = eventDoc.data();
    if (data.attendees?.includes(user.uid)) throw new Error('You have already RSVP\'d');
    if (data.slotsFilled >= data.maxSlots) throw new Error('Event is full!');

    const newSlotsFilled = (data.slotsFilled || 0) + 1;
    transaction.update(eventRef, {
      slotsFilled: newSlotsFilled,
      attendees: arrayUnion(user.uid),
    });

    return { slotsFilled: newSlotsFilled };
  });

  return { ...result, success: true };
}

/**
 * Cancel RSVP
 * @param {string} eventId
 */
export async function cancelRsvp(eventId) {
  const user = getCurrentUser() || { uid: 'guest-user-default', displayName: 'Anonymous Volunteer' };

  if (!isFirebaseAvailable()) {
    const event = DEMO_EVENTS.find(e => e.id === eventId);
    if (event && event.slotsFilled > 0) {
      event.slotsFilled--;
      event.attendees = event.attendees.filter(a => a !== user.uid);
    }
    return;
  }

  const db = await getDb();
  const { doc, runTransaction, arrayRemove } = await import('https://www.gstatic.com/firebasejs/11.6.0/firebase-firestore.js');

  const eventRef = doc(db, COLLECTIONS.COMMUNITY_EVENTS, eventId);

  await runTransaction(db, async (transaction) => {
    const eventDoc = await transaction.get(eventRef);
    if (!eventDoc.exists()) throw new Error('Event not found');

    const data = eventDoc.data();
    if (!data.attendees?.includes(user.uid)) return;

    transaction.update(eventRef, {
      slotsFilled: Math.max(0, (data.slotsFilled || 1) - 1),
      attendees: arrayRemove(user.uid),
    });
  });
}

/**
 * Create a new community event (municipality only)
 * @param {{ title: string, description: string, date: string, location: string, maxSlots: number, coordinates: { lat: number, lng: number } }} eventData
 */
export async function createEvent(eventData) {
  const user = getCurrentUser();
  if (!user || !isMunicipality()) throw new Error('Only municipality officers can create events.');

  const event = {
    ...eventData,
    slotsFilled: 0,
    attendees: [],
    createdBy: user.displayName,
    createdAt: new Date().toISOString(),
    category: 'community',
  };

  if (!isFirebaseAvailable()) {
    const demoId = 'demo-evt-' + Date.now();
    DEMO_EVENTS.push({ id: demoId, ...event });
    console.log('[Community] Demo event created:', demoId);
    return { id: demoId };
  }

  const db = await getDb();
  const { collection, addDoc, serverTimestamp } = await import('https://www.gstatic.com/firebasejs/11.6.0/firebase-firestore.js');
  event.createdAt = serverTimestamp();
  const docRef = await addDoc(collection(db, COLLECTIONS.COMMUNITY_EVENTS), event);
  return { id: docRef.id };
}

// ── Community UI Panel ──

const EVENT_ICONS = {
  cleanup: 'cleaning_services',
  plantation: 'park',
  workshop: 'school',
  community: 'groups',
};

/**
 * Render community events panel
 * @param {string} containerId
 */
export async function renderCommunityPanel(containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;

  const events = await getUpcomingEvents();
  const user = getCurrentUser();

  container.innerHTML = `
    <div class="space-y-4">
      <div class="flex items-center justify-between mb-2">
        <h3 class="font-headline-sm text-headline-sm text-on-surface">Community Actions</h3>
        <span class="px-2 py-1 bg-secondary/10 text-secondary rounded-full text-[11px] font-bold">${events.length} upcoming</span>
      </div>

      ${events.map(evt => {
        const slotsPercent = Math.round((evt.slotsFilled / evt.maxSlots) * 100);
        const isFull = evt.slotsFilled >= evt.maxSlots;
        const hasRsvpd = evt.attendees?.includes(user?.uid);
        const icon = EVENT_ICONS[evt.category] || 'event';
        const eventDate = new Date(evt.date);
        const dateStr = eventDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
        const timeStr = eventDate.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });

        return `
          <div class="p-4 rounded-xl border border-outline-variant/30 bg-surface-container-lowest hover:shadow-md transition-shadow">
            <div class="flex items-start gap-3">
              <div class="w-10 h-10 rounded-lg bg-secondary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                <span class="material-symbols-outlined text-secondary">${icon}</span>
              </div>
              <div class="flex-1 min-w-0">
                <h4 class="font-label-md text-label-md text-on-surface mb-1 truncate">${evt.title}</h4>
                <p class="text-[11px] text-on-surface-variant line-clamp-2 mb-2">${evt.description}</p>
                <div class="flex items-center gap-3 text-[11px] text-on-surface-variant mb-3">
                  <span class="flex items-center gap-1"><span class="material-symbols-outlined text-[14px]">calendar_today</span>${dateStr}</span>
                  <span class="flex items-center gap-1"><span class="material-symbols-outlined text-[14px]">schedule</span>${timeStr}</span>
                  <span class="flex items-center gap-1"><span class="material-symbols-outlined text-[14px]">location_on</span>${evt.location.split(',')[0]}</span>
                </div>

                <!-- Slot progress bar -->
                <div class="mb-3">
                  <div class="flex justify-between items-center text-[11px] mb-1">
                    <span class="text-on-surface-variant">${evt.slotsFilled}/${evt.maxSlots} spots filled</span>
                    <span class="font-bold ${isFull ? 'text-error' : 'text-secondary'}">${slotsPercent}%</span>
                  </div>
                  <div class="w-full h-1.5 bg-surface-container-highest rounded-full overflow-hidden">
                    <div class="h-full rounded-full transition-all duration-500 ${isFull ? 'bg-error' : 'bg-secondary'}" style="width: ${slotsPercent}%"></div>
                  </div>
                </div>

                <button data-event-id="${evt.id}" class="rsvp-btn w-full py-1.5 rounded-lg text-[11px] font-bold transition-colors ${
                  hasRsvpd ? 'bg-surface-container-high text-on-surface-variant hover:bg-error/10 hover:text-error' :
                  isFull ? 'bg-surface-container-high text-on-surface-variant cursor-not-allowed' :
                  'bg-secondary text-on-secondary hover:bg-secondary/90'
                }" ${isFull && !hasRsvpd ? 'disabled' : ''}>
                  ${hasRsvpd ? '✓ Going — Click to Cancel' : isFull ? 'Event Full' : 'RSVP Now'}
                </button>
              </div>
            </div>
          </div>
        `;
      }).join('')}
    </div>
  `;

  // Attach RSVP handlers
  container.querySelectorAll('.rsvp-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const eventId = btn.dataset.eventId;
      try {
        const evt = events.find(e => e.id === eventId);
        const hasRsvpd = evt?.attendees?.includes(user?.uid);

        if (hasRsvpd) {
          await cancelRsvp(eventId);
          window.__aerostreet?.showToast?.('RSVP cancelled', 'info');
        } else {
          await rsvpEvent(eventId);
          window.__aerostreet?.showToast?.('RSVP confirmed! 🎉', 'success');
        }
        // Re-render
        await renderCommunityPanel(containerId);
      } catch (err) {
        window.__aerostreet?.showToast?.(err.message, 'error');
      }
    });
  });
}
