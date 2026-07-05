// ============================================
// AeroStreet AI — Demo Data Seeder
// ============================================
// Populates Firestore with realistic demo data
// for all collections. Run: `node server/seed-data.js`

import 'dotenv/config';

const SEED_DATA = {
  hotspots: [
    { id: 'delhi', name: 'Delhi', state: 'NCT', aqi: 345, coordinates: { lat: 28.6139, lng: 77.2090 }, source: 'sensor', pollutants: [{ name: 'PM2.5', value: 250, unit: 'µg/m³' }, { name: 'PM10', value: 380, unit: 'µg/m³' }, { name: 'NO2', value: 85, unit: 'ppb' }] },
    { id: 'mumbai', name: 'Mumbai', state: 'Maharashtra', aqi: 142, coordinates: { lat: 19.0760, lng: 72.8777 }, source: 'sensor', pollutants: [{ name: 'PM2.5', value: 65, unit: 'µg/m³' }, { name: 'NO2', value: 45, unit: 'ppb' }] },
    { id: 'bangalore', name: 'Bangalore', state: 'Karnataka', aqi: 55, coordinates: { lat: 12.9716, lng: 77.5946 }, source: 'sensor', pollutants: [{ name: 'PM2.5', value: 30, unit: 'µg/m³' }] },
    { id: 'gurugram', name: 'Gurugram', state: 'Haryana', aqi: 290, coordinates: { lat: 28.4595, lng: 77.0266 }, source: 'sensor', pollutants: [{ name: 'PM2.5', value: 195, unit: 'µg/m³' }] },
    { id: 'pune', name: 'Pune', state: 'Maharashtra', aqi: 112, coordinates: { lat: 18.5204, lng: 73.8567 }, source: 'sensor', pollutants: [{ name: 'PM2.5', value: 55, unit: 'µg/m³' }] },
    { id: 'kolkata', name: 'Kolkata', state: 'West Bengal', aqi: 178, coordinates: { lat: 22.5726, lng: 88.3639 }, source: 'sensor', pollutants: [{ name: 'PM2.5', value: 98, unit: 'µg/m³' }] },
    { id: 'aizawl', name: 'Aizawl', state: 'Mizoram', aqi: 22, coordinates: { lat: 23.7271, lng: 92.7176 }, source: 'sensor', pollutants: [{ name: 'PM2.5', value: 12, unit: 'µg/m³' }] },
  ],

  reports: [
    { category: 'smoke', description: 'Heavy industrial smoke from factory near MG Road', coordinates: { lat: 28.6139, lng: 77.2090 }, status: 'Pending', userName: 'Ravi K.', userId: 'user-001', source: 'citizen', createdAt: new Date(Date.now() - 2 * 3600000).toISOString() },
    { category: 'litter', description: 'Illegal dumping near Yamuna riverbank', coordinates: { lat: 28.6328, lng: 77.2197 }, status: 'In Progress', userName: 'Priya M.', userId: 'user-002', source: 'citizen', createdAt: new Date(Date.now() - 24 * 3600000).toISOString() },
    { category: 'burning', description: 'Open waste burning in Koramangala residential area', coordinates: { lat: 12.9352, lng: 77.6245 }, status: 'Resolved', userName: 'Arjun S.', userId: 'user-003', source: 'citizen', createdAt: new Date(Date.now() - 48 * 3600000).toISOString() },
    { category: 'dust', description: 'Construction site without water sprinklers in Dwarka Sector 21', coordinates: { lat: 28.5636, lng: 77.0560 }, status: 'Pending', userName: 'Neha G.', userId: 'user-004', source: 'citizen', createdAt: new Date(Date.now() - 4 * 3600000).toISOString() },
  ],

  community_events: [
    { title: 'River Yamuna Cleanup Drive', description: 'Join us for a community cleanup along the Yamuna riverbank. Gloves and bags provided.', date: new Date(Date.now() + 7 * 86400000).toISOString(), location: 'Yamuna Ghat, Delhi', coordinates: { lat: 28.6328, lng: 77.2197 }, maxSlots: 50, slotsFilled: 34, attendees: [], createdBy: 'Municipality of Delhi', category: 'cleanup' },
    { title: 'Tree Plantation — Green Bengaluru', description: 'Plant 500 saplings across Cubbon Park. Refreshments and certificates for participants.', date: new Date(Date.now() + 10 * 86400000).toISOString(), location: 'Cubbon Park, Bangalore', coordinates: { lat: 12.9763, lng: 77.5929 }, maxSlots: 100, slotsFilled: 78, attendees: [], createdBy: 'BBMP Green Initiative', category: 'plantation' },
    { title: 'Air Quality Awareness Workshop', description: 'Learn about AQI monitoring, health impacts, and what you can do to reduce pollution.', date: new Date(Date.now() + 15 * 86400000).toISOString(), location: 'Town Hall, Pune', coordinates: { lat: 18.5204, lng: 73.8567 }, maxSlots: 30, slotsFilled: 12, attendees: [], createdBy: 'PMC Environment Dept', category: 'workshop' },
  ],

  cctv_alerts: [
    { type: 'CCTV_Alert', name: 'CCTV: Heavy Smoke', detectedIssue: 'Heavy Smoke', confidence: 0.94, description: 'Heavy industrial smoke detected near Anand Vihar industrial zone', cameraId: 'CAM-A14', coordinates: { lat: 28.5900, lng: 77.2300 }, status: 'Pending', aqi: 400, pollutants: [{ name: 'Detection', value: 'Heavy Smoke', unit: '' }, { name: 'Confidence', value: '94%', unit: '' }], source: 'CCTV_Alert', createdAt: new Date(Date.now() - 1800000).toISOString() },
    { type: 'CCTV_Alert', name: 'CCTV: Illegal Dumping', detectedIssue: 'Litter/Dumping', confidence: 0.87, description: 'Suspected illegal waste dumping detected near drainage canal', cameraId: 'CAM-M07', coordinates: { lat: 19.0500, lng: 72.8900 }, status: 'Pending', aqi: 200, pollutants: [{ name: 'Detection', value: 'Illegal Dumping', unit: '' }, { name: 'Confidence', value: '87%', unit: '' }], source: 'CCTV_Alert', createdAt: new Date(Date.now() - 3600000).toISOString() },
  ],

  users: [
    { uid: 'user-001', email: 'ravi@example.com', displayName: 'Ravi K.', role: 'citizen', createdAt: new Date().toISOString() },
    { uid: 'user-002', email: 'priya@example.com', displayName: 'Priya M.', role: 'citizen', createdAt: new Date().toISOString() },
    { uid: 'muni-001', email: 'officer@delhi.gov.in', displayName: 'Municipal Officer', role: 'municipality', createdAt: new Date().toISOString() },
  ],
};

async function seedFirestore() {
  console.log('\n╔══════════════════════════════════════════════╗');
  console.log('║   🌱 AeroStreet AI — Database Seeder          ║');
  console.log('╚══════════════════════════════════════════════╝\n');

  if (!process.env.FIREBASE_SERVICE_ACCOUNT_PATH) {
    console.log('ℹ No FIREBASE_SERVICE_ACCOUNT_PATH in .env');
    console.log('ℹ Printing seed data that would be written to Firestore:\n');

    for (const [collection, docs] of Object.entries(SEED_DATA)) {
      console.log(`📁 ${collection}: ${docs.length} documents`);
      docs.forEach((doc, i) => {
        console.log(`  ${i + 1}. ${doc.name || doc.title || doc.displayName || doc.category || doc.detectedIssue}`);
      });
    }

    console.log('\n✅ Seed data preview complete.');
    console.log('   To seed Firestore, set FIREBASE_SERVICE_ACCOUNT_PATH in .env\n');
    return;
  }

  try {
    const admin = (await import('firebase-admin')).default;
    const fs = await import('fs');

    if (!admin.apps.length) {
      const serviceAccount = JSON.parse(fs.readFileSync(process.env.FIREBASE_SERVICE_ACCOUNT_PATH, 'utf8'));
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
      });
    }

    const db = admin.firestore();

    for (const [collectionName, docs] of Object.entries(SEED_DATA)) {
      console.log(`\n📁 Seeding ${collectionName}...`);
      const batch = db.batch();

      for (const doc of docs) {
        const id = doc.id || doc.uid || undefined;
        const ref = id ? db.collection(collectionName).doc(id) : db.collection(collectionName).doc();
        const cleanDoc = { ...doc };
        delete cleanDoc.id;
        delete cleanDoc.uid;
        batch.set(ref, cleanDoc);
        console.log(`  ✓ ${id || ref.id}: ${doc.name || doc.title || doc.displayName || doc.category || 'document'}`);
      }

      await batch.commit();
      console.log(`  ✅ ${docs.length} documents committed`);
    }

    console.log('\n✅ Database seeded successfully!\n');
  } catch (err) {
    console.error('\n✗ Seeding failed:', err.message);
    process.exit(1);
  }
}

seedFirestore();
