// ============================================
// Unit Tests: CPCB Indian AQI Utilities
// ============================================

import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateIndianAQI, getAQICategory, normalizeTelemetry } from '../server/utils/aqi.js';

test('calculateIndianAQI: handles boundary and invalid inputs', () => {
  assert.equal(calculateIndianAQI(null), 0);
  assert.equal(calculateIndianAQI(undefined), 0);
  assert.equal(calculateIndianAQI(-10), 0);
  assert.equal(calculateIndianAQI(0), 0);
});

test('calculateIndianAQI: calculates official CPCB PM2.5 piecewise linear breakpoints', () => {
  // Good: 0-30 ug/m3 -> 0-50 AQI
  assert.equal(calculateIndianAQI(15), 25);
  assert.equal(calculateIndianAQI(30), 50);

  // Satisfactory: 31-60 ug/m3 -> 51-100 AQI
  assert.equal(calculateIndianAQI(45), 75);
  assert.equal(calculateIndianAQI(60), 100);

  // Moderate: 61-90 ug/m3 -> 101-200 AQI
  assert.equal(calculateIndianAQI(75), 150);
  assert.equal(calculateIndianAQI(90), 200);

  // Poor: 91-120 ug/m3 -> 201-300 AQI
  assert.equal(calculateIndianAQI(105), 250);
  assert.equal(calculateIndianAQI(120), 300);

  // Very Poor: 121-250 ug/m3 -> 301-400 AQI
  assert.equal(calculateIndianAQI(185), 350);
  assert.equal(calculateIndianAQI(250), 400);

  // Severe: 250+ ug/m3 -> 401-500 AQI (capped at 500)
  assert.equal(calculateIndianAQI(300), 450);
  assert.equal(calculateIndianAQI(350), 500);
  assert.equal(calculateIndianAQI(600), 500);
});

test('getAQICategory: classifies correct CPCB severity categories and GRAP stages', () => {
  const good = getAQICategory(35);
  assert.equal(good.category, 'Good');
  assert.equal(good.color, '#10b981');
  assert.equal(good.grapStage, 'Normal');

  const satisfactory = getAQICategory(85);
  assert.equal(satisfactory.category, 'Satisfactory');
  assert.equal(satisfactory.color, '#84cc16');

  const moderate = getAQICategory(150);
  assert.equal(moderate.category, 'Moderate');
  assert.equal(moderate.color, '#f59e0b');

  const poor = getAQICategory(260);
  assert.equal(poor.category, 'Poor');
  assert.equal(poor.color, '#f97316');
  assert.match(poor.grapStage, /GRAP Stage I/);

  const veryPoor = getAQICategory(345);
  assert.equal(veryPoor.category, 'Very Poor');
  assert.equal(veryPoor.color, '#ef4444');
  assert.match(veryPoor.grapStage, /GRAP Stage II & III/);

  const severe = getAQICategory(460);
  assert.equal(severe.category, 'Severe');
  assert.equal(severe.color, '#7c3aed');
  assert.match(severe.grapStage, /GRAP Stage IV/);
});

test('normalizeTelemetry: properly maps provider data to standard schema', () => {
  const mockOpenAQ = {
    id: 'oa-1',
    name: 'Anand Vihar, Delhi',
    locality: 'Delhi',
    coordinates: { latitude: 28.6476, longitude: 77.3158 },
    pollutants: [{ name: 'PM2.5', value: 235, unit: 'µg/m³' }],
  };

  const normalized = normalizeTelemetry(mockOpenAQ, 'openaq');
  assert.equal(normalized.locality, 'Delhi');
  assert.equal(normalized.pollutants.pm25, 235);
  assert.ok(normalized.aqi > 300);
  assert.equal(normalized.category, 'Very Poor');
  assert.equal(normalized.coordinates.lat, 28.6476);
  assert.equal(normalized.coordinates.lng, 77.3158);
  assert.equal(normalized.source, 'openaq');
});

test('Indian States & UTs dataset: strictly 36 unique administrative entities with zero duplicates', async () => {
  const { DEMO_STATES } = await import('../public/js/demo-data.js');
  assert.equal(DEMO_STATES.length, 36, 'India must have exactly 28 states + 8 UTs = 36 total');

  const names = DEMO_STATES.map((s) => s.name);
  const ids = DEMO_STATES.map((s) => s.id);

  const uniqueNames = new Set(names);
  const uniqueIds = new Set(ids);

  assert.equal(uniqueNames.size, 36, 'All 36 state/UT names must be strictly unique');
  assert.equal(uniqueIds.size, 36, 'All 36 state/UT IDs must be strictly unique');

  // Verify Dadra & Nagar Haveli and Daman & Diu is deduplicated
  const dadraEntries = DEMO_STATES.filter((s) => s.name.includes('Dadra'));
  assert.equal(
    dadraEntries.length,
    1,
    'Unified UT of Dadra and Nagar Haveli and Daman and Diu must appear exactly once'
  );

  // Verify STATE_PATHS map geometries are also strictly deduplicated
  const { STATE_PATHS } = await import('../public/js/india-map-svg.js');
  const pathNames = STATE_PATHS.map((s) => s.name);
  const pathIds = STATE_PATHS.map((s) => s.id);
  assert.equal(
    new Set(pathNames).size,
    STATE_PATHS.length,
    'All entries in STATE_PATHS must have unique names'
  );
  assert.equal(
    new Set(pathIds).size,
    STATE_PATHS.length,
    'All entries in STATE_PATHS must have unique IDs'
  );
  const dadraPaths = STATE_PATHS.filter((s) => s.name.includes('Dadra'));
  assert.equal(
    dadraPaths.length,
    1,
    'Dadra and Nagar Haveli and Daman and Diu must appear exactly once in STATE_PATHS'
  );
});
