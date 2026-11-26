// ============================================
// Integration Tests: AeroStreet Express API
// ============================================

import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import app from '../server/index.js';

let server;
let baseUrl;

test.before(async () => {
  await new Promise((resolve) => {
    // Listen on random port
    server = http.createServer(app).listen(0, '127.0.0.1', () => {
      const port = server.address().port;
      baseUrl = `http://127.0.0.1:${port}`;
      resolve();
    });
  });
});

test.after(async () => {
  await new Promise((resolve) => server.close(resolve));
});

test('GET /api/health: returns healthy status and mode', async () => {
  const res = await fetch(`${baseUrl}/api/health`);
  assert.equal(res.status, 200);
  const data = await res.json();
  assert.equal(data.status, 'ok');
  assert.ok(data.timestamp);
});

test('Security Headers: verifies OWASP & WCAG security headers', async () => {
  const res = await fetch(`${baseUrl}/api/health`);
  assert.equal(res.headers.get('x-content-type-options'), 'nosniff');
  assert.equal(res.headers.get('x-frame-options'), 'DENY');
  assert.equal(res.headers.get('referrer-policy'), 'strict-origin-when-cross-origin');
  assert.ok(res.headers.get('content-security-policy'));
  assert.ok(res.headers.get('x-ratelimit-limit'));
});

test('GET /api/live-aqi: returns populated station list with valid schema and Cache-Control', async () => {
  const res = await fetch(`${baseUrl}/api/live-aqi`);
  assert.equal(res.status, 200);
  assert.ok(res.headers.get('cache-control')?.includes('max-age'));
  const stations = await res.json();
  assert.ok(Array.isArray(stations));
  assert.ok(stations.length > 0);

  const first = stations[0];
  assert.ok(first.id);
  assert.ok(first.name);
  assert.ok(typeof first.aqi === 'number');
  assert.ok(first.coordinates.lat);
  assert.ok(first.coordinates.lng);
});

test('POST /api/gemini-forecast-insights: returns 7-day predicted curve and advisory', async () => {
  const res = await fetch(`${baseUrl}/api/gemini-forecast-insights`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      traffic: 65,
      industry: 50,
      wind: 10,
      temp: 26,
      baseline: 210,
    }),
  });

  assert.equal(res.status, 200);
  const data = await res.json();
  assert.equal(data.success, true);
  assert.ok(Array.isArray(data.forecast));
  assert.equal(data.forecast.length, 7);
  assert.ok(typeof data.insights === 'string');
});

test('POST /api/gemini-forecast-insights: rejects missing required fields with HTTP 400', async () => {
  const res = await fetch(`${baseUrl}/api/gemini-forecast-insights`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      traffic: 50,
      // missing industry, wind, temp
    }),
  });

  assert.equal(res.status, 400);
  const data = await res.json();
  assert.equal(data.success, false);
  assert.ok(data.error.includes('Missing required numeric parameters'));
});

test('POST /api/assistant: returns context-aware urban advisory for citizen commute & health', async () => {
  const res = await fetch(`${baseUrl}/api/assistant`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      city: 'Delhi',
      ward: 'Anand Vihar',
      activity: 'commute',
      sensitivity: 'respiratory_asthma',
      currentAQI: 320,
    }),
  });

  assert.equal(res.status, 200);
  const data = await res.json();
  assert.equal(data.success, true);
  assert.equal(data.city, 'Delhi');
  assert.equal(data.category, 'Very Poor');
  assert.ok(data.riskScore >= 70);
  assert.ok(data.safeWindow);
  assert.ok(data.protection.includes('N95'));
  assert.ok(data.commuteTip);
  assert.ok(data.activityAdvice);
});

test('POST /api/generate-legal-notice: generates formal cease-and-desist letter', async () => {
  const res = await fetch(`${baseUrl}/api/generate-legal-notice`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      incident:
        'Dense industrial black smoke observed from chimney stack at Anand Vihar industrial cluster.',
    }),
  });

  assert.equal(res.status, 200);
  const data = await res.json();
  assert.equal(data.success, true);
  assert.ok(data.notice.includes('LEGAL NOTICE'));
  assert.ok(data.notice.includes('AIR (PREVENTION AND CONTROL OF POLLUTION) ACT'));
});

test('GET /robots.txt: returns valid robots directives with HTTP 200', async () => {
  const res = await fetch(`${baseUrl}/robots.txt`);
  assert.equal(res.status, 200);
  assert.ok(res.headers.get('content-type')?.includes('text/plain'));
  const body = await res.text();
  assert.ok(body.includes('User-agent: *'));
  assert.ok(body.includes('Sitemap:'));
});

test('GET /sitemap.xml: returns valid XML sitemap with HTTP 200', async () => {
  const res = await fetch(`${baseUrl}/sitemap.xml`);
  assert.equal(res.status, 200);
  assert.ok(res.headers.get('content-type')?.includes('xml'));
  const body = await res.text();
  assert.ok(body.includes('<urlset'));
  assert.ok(body.includes('https://aerostreetai.vercel.app/national.html'));
});
