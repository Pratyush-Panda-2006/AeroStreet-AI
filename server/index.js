// ============================================
// AeroStreet AI — Express Server
// ============================================
// Serves static frontend files and provides API
// endpoints for Gemini AI proxy and CCTV webhook.

import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import multer from 'multer';

import { calculateIndianAQI, getAQICategory, normalizeTelemetry } from './utils/aqi.js';
import { telemetryCache, geminiCache } from './utils/cache.js';
import { securityHeadersMiddleware, corsOriginCheck, rateLimiter } from './middleware/security.js';
import {
  validateForecastInputs,
  validateCoordinates,
  validateAssistantRequest,
} from './middleware/validate.js';
import { queryUrbanAssistant, generateDeterministicAdvice } from './utils/assistant.js';
import { errorHandler } from './middleware/errorHandler.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Pre-reference templates with literal paths so @vercel/nft traces and bundles them automatically
const TEMPLATE_FILES = {
  'national.html': join(__dirname, '../templates/national.html'),
  'district.html': join(__dirname, '../templates/district.html'),
  'municipality.html': join(__dirname, '../templates/municipality.html'),
  'forecast.html': join(__dirname, '../templates/forecast.html'),
  'community.html': join(__dirname, '../templates/community.html'),
  'methodology.html': join(__dirname, '../templates/methodology.html'),
  'privacy.html': join(__dirname, '../templates/privacy.html'),
  'terms.html': join(__dirname, '../templates/terms.html'),
};

// Helper to reliably find assets across local development and Vercel serverless environments
function resolveAssetPath(...segments) {
  if (
    segments[0] === 'templates' &&
    TEMPLATE_FILES[segments[1]] &&
    fs.existsSync(TEMPLATE_FILES[segments[1]])
  ) {
    return TEMPLATE_FILES[segments[1]];
  }

  const cwdCandidate = join(process.cwd(), ...segments);
  if (fs.existsSync(cwdCandidate)) return cwdCandidate;

  const dirnameCandidate = join(__dirname, '..', ...segments);
  if (fs.existsSync(dirnameCandidate)) return dirnameCandidate;

  return cwdCandidate;
}

const app = express();
const PORT = process.env.PORT || 3000;

// ── Security Hardening ──
app.disable('x-powered-by');
app.use(securityHeadersMiddleware);
app.use(cors({ origin: corsOriginCheck() }));
app.use(express.json({ limit: '100kb' }));
app.use(express.urlencoded({ extended: true, limit: '100kb' }));

// ── Rate Limiting ──
const generalLimiter = rateLimiter({ windowMs: 60 * 1000, max: 60 });
const aiLimiter = rateLimiter({
  windowMs: 60 * 1000,
  max: 15,
  message: 'AI rate limit exceeded (15 req/min). Please try again shortly.',
});

app.use('/api/', generalLimiter);

// Map clean URLs and file names to actual template files
const TEMPLATE_MAP = {
  '/': 'national.html',
  '/index.html': 'national.html',
  '/national': 'national.html',
  '/national.html': 'national.html',
  '/district': 'district.html',
  '/districts': 'district.html',
  '/district.html': 'district.html',
  '/districts.html': 'district.html',
  '/municipality': 'municipality.html',
  '/municipality.html': 'municipality.html',
  '/forecast': 'forecast.html',
  '/forecast.html': 'forecast.html',
  '/community': 'community.html',
  '/community.html': 'community.html',
  '/methodology': 'methodology.html',
  '/methodology.html': 'methodology.html',
  '/privacy': 'privacy.html',
  '/privacy.html': 'privacy.html',
  '/terms': 'terms.html',
  '/terms.html': 'terms.html',
};

// ── Inject config into HTML pages ──
// This middleware intercepts HTML requests and injects the client config.
// Sensitive server keys (GEMINI_API_KEY) are intentionally excluded to prevent client leakage.
app.use((req, res, next) => {
  const cleanPath =
    req.path.endsWith('/') && req.path.length > 1 ? req.path.slice(0, -1) : req.path;
  let templateFile = TEMPLATE_MAP[cleanPath];

  if (!templateFile && cleanPath.endsWith('.html')) {
    templateFile = cleanPath.slice(1);
    if (templateFile === 'districts.html') {
      templateFile = 'district.html';
    }
  }

  if (templateFile) {
    const fullPath = resolveAssetPath('templates', templateFile);

    fs.readFile(fullPath, 'utf8', (err, html) => {
      if (err) {
        console.error(
          `[AeroStreet] Error reading template "${templateFile}" at "${fullPath}":`,
          err.message
        );
        return res.status(404).send(`Template not found: ${templateFile}`);
      }

      // Inject client config script before closing </head>
      const configScript = `
<script>
  window.__AEROSTREET_CONFIG__ = {
    firebaseApiKey: "${process.env.FIREBASE_API_KEY || ''}",
    firebaseAuthDomain: "${process.env.FIREBASE_AUTH_DOMAIN || ''}",
    firebaseProjectId: "${process.env.FIREBASE_PROJECT_ID || ''}",
    firebaseStorageBucket: "${process.env.FIREBASE_STORAGE_BUCKET || ''}",
    firebaseMessagingSenderId: "${process.env.FIREBASE_MESSAGING_SENDER_ID || ''}",
    firebaseAppId: "${process.env.FIREBASE_APP_ID || ''}",
    googleMapsApiKey: "${process.env.GOOGLE_MAPS_API_KEY || ''}",
    geminiApiKey: "", // Kept server-side in /api/* endpoints for security
    windyApiKey: "${process.env.WINDY_API_KEY || ''}",
    waqiApiToken: "${process.env.WAQI_API_TOKEN || ''}",
    iqairApiKey: "${process.env.IQAIR_API_KEY || ''}",
    apiBaseUrl: ""
  };
</script>`;

      const injectedHtml = html.includes('</head>')
        ? html.replace('</head>', configScript + '\n</head>')
        : html + configScript;

      return res.type('html').send(injectedHtml);
    });
    return;
  }
  next();
});

// ── IQAir AirVisual API Cache & Proxy ──
const iqairCache = new Map();
const CACHE_TTL = 15 * 60 * 1000; // 15 minutes in ms

app.get('/api/iqair/nearest', async (req, res) => {
  const { lat, lon } = req.query;
  const apiKey = process.env.IQAIR_API_KEY;

  if (!apiKey) {
    return res
      .status(400)
      .json({ status: 'error', message: 'IQAIR_API_KEY not configured in .env' });
  }

  if (!lat || !lon) {
    return res.status(400).json({ status: 'error', message: 'Missing lat or lon coordinates' });
  }

  const cacheKey = `nearest_${parseFloat(lat).toFixed(2)}_${parseFloat(lon).toFixed(2)}`;
  const cached = iqairCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return res.json({ status: 'success', source: 'cache', data: cached.data });
  }

  try {
    const url = `http://api.airvisual.com/v2/nearest_city?lat=${lat}&lon=${lon}&key=${apiKey}`;
    const response = await fetch(url);
    const result = await response.json();

    if (result.status === 'success') {
      iqairCache.set(cacheKey, { timestamp: Date.now(), data: result.data });
      return res.json({ status: 'success', source: 'live', data: result.data });
    } else {
      return res
        .status(502)
        .json({ status: 'fail', message: result.data?.message || 'IQAir API error' });
    }
  } catch (error) {
    console.error('[IQAir Server Proxy Error]', error.message);
    return res.status(500).json({ status: 'error', message: error.message });
  }
});

app.get('/api/iqair/city', async (req, res) => {
  const { city, state, country = 'India' } = req.query;
  const apiKey = process.env.IQAIR_API_KEY;

  if (!apiKey) {
    return res
      .status(400)
      .json({ status: 'error', message: 'IQAIR_API_KEY not configured in .env' });
  }

  const cacheKey = `city_${city}_${state}_${country}`.toLowerCase();
  const cached = iqairCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return res.json({ status: 'success', source: 'cache', data: cached.data });
  }

  try {
    const url = `http://api.airvisual.com/v2/city?city=${encodeURIComponent(city)}&state=${encodeURIComponent(state)}&country=${encodeURIComponent(country)}&key=${apiKey}`;
    const response = await fetch(url);
    const result = await response.json();

    if (result.status === 'success') {
      iqairCache.set(cacheKey, { timestamp: Date.now(), data: result.data });
      return res.json({ status: 'success', source: 'live', data: result.data });
    } else {
      return res
        .status(502)
        .json({ status: 'fail', message: result.data?.message || 'IQAir API error' });
    }
  } catch (error) {
    console.error('[IQAir City Proxy Error]', error.message);
    return res.status(500).json({ status: 'error', message: error.message });
  }
});

// ── Serve static files & SEO routes ──
const publicDir = resolveAssetPath('public');

app.get('/robots.txt', (req, res) => {
  res.type('text/plain').sendFile(join(publicDir, 'robots.txt'));
});

app.get('/sitemap.xml', (req, res) => {
  res.type('application/xml').sendFile(join(publicDir, 'sitemap.xml'));
});

app.use(
  express.static(publicDir, {
    maxAge: '1d',
    setHeaders: (res, filePath) => {
      if (filePath.endsWith('.html')) {
        res.setHeader('Cache-Control', 'public, max-age=0, must-revalidate');
      } else {
        res.setHeader('Cache-Control', 'public, max-age=86400, immutable');
      }
    },
  })
);

// ── API Routes ──

/**
 * POST /api/gemini-analyze
 * Proxy endpoint for Gemini API calls (keeps API key server-side)
 */
app.post('/api/gemini-analyze', aiLimiter, async (req, res) => {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    return res.status(200).json({
      success: true,
      demo: true,
      result: {
        recommendations: [
          {
            priority: 'high',
            title: 'Demo: Heavy Vehicle Diversion Recommended',
            description:
              'This is a demo recommendation. Add a GEMINI_API_KEY to .env for real AI analysis.',
            impact: 'Add API key for real impact estimates',
            icon: 'local_shipping',
          },
        ],
      },
    });
  }

  try {
    const { GoogleGenerativeAI } = await import('@google/generative-ai');
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

    const { prompt, context } = req.body;

    const fullPrompt = `You are an expert urban environmental analyst for Indian municipalities.
${context ? `Context data: ${JSON.stringify(context)}` : ''}

${prompt}

Respond with a JSON array of recommendations. Each recommendation must have:
- priority: "critical", "high", "medium", or "info"
- title: Short action title (max 10 words)
- description: Detailed explanation (2-3 sentences)
- impact: Expected quantitative impact
- icon: A Google Material Symbols icon name

Return ONLY valid JSON, no markdown.`;

    const result = await model.generateContent(fullPrompt);
    const text = result.response.text();

    // Parse JSON from response
    let recommendations;
    try {
      const jsonMatch = text.match(/\[[\s\S]*\]/);
      recommendations = jsonMatch ? JSON.parse(jsonMatch[0]) : [];
    } catch {
      recommendations = [
        {
          priority: 'info',
          title: 'Analysis Complete',
          description: text,
          impact: 'See details',
          icon: 'smart_toy',
        },
      ];
    }

    res.json({ success: true, result: { recommendations } });
  } catch (err) {
    console.error('[Gemini API Error]', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/cctv-alert
 * Webhook endpoint for CCTV simulator to post alerts
 */
app.post('/api/cctv-alert', async (req, res) => {
  const { detectedIssue, confidence, description, cameraId, coordinates, frameUrl } = req.body;

  if (!detectedIssue || confidence === undefined) {
    return res.status(400).json({ error: 'Missing required fields: detectedIssue, confidence' });
  }

  const alert = {
    type: 'CCTV_Alert',
    name: `CCTV: ${detectedIssue}`,
    detectedIssue,
    confidence,
    description: description || '',
    cameraId: cameraId || 'unknown',
    coordinates: coordinates || { lat: 28.6139, lng: 77.209 },
    frameUrl: frameUrl || '',
    status: 'Pending',
    aqi: confidence > 0.9 ? 400 : 250,
    pollutants: [
      { name: 'Detection', value: detectedIssue, unit: '' },
      { name: 'Confidence', value: `${Math.round(confidence * 100)}%`, unit: '' },
    ],
    createdAt: new Date().toISOString(),
    source: 'CCTV_Alert',
  };

  // If Firebase Admin is available, write to Firestore
  try {
    if (process.env.FIREBASE_SERVICE_ACCOUNT_PATH) {
      const admin = await import('firebase-admin');
      if (!admin.default.apps.length) {
        const fs = await import('fs');
        const serviceAccount = JSON.parse(
          fs.readFileSync(process.env.FIREBASE_SERVICE_ACCOUNT_PATH, 'utf8')
        );
        admin.default.initializeApp({
          credential: admin.default.credential.cert(serviceAccount),
        });
      }
      const db = admin.default.firestore();
      const docRef = await db.collection('cctv_alerts').add(alert);
      console.log(`[CCTV] Alert stored in Firestore: ${docRef.id}`);
      return res.json({ success: true, id: docRef.id, alert });
    }
  } catch (err) {
    console.warn('[CCTV] Firestore write failed, returning mock response:', err.message);
  }

  // Fallback: return success without Firestore
  const mockId = 'cctv-alert-' + Date.now();
  console.log(`[CCTV] Alert received (mock): ${mockId}`, alert);
  res.json({ success: true, id: mockId, alert });
});

/**
 * GET /api/recommendations/:districtId
 * Get latest AI recommendations for a district
 */
app.get('/api/recommendations/:districtId', async (req, res) => {
  // Try Firestore first
  try {
    if (process.env.FIREBASE_SERVICE_ACCOUNT_PATH) {
      const admin = await import('firebase-admin');
      if (admin.default.apps.length) {
        const db = admin.default.firestore();
        const snapshot = await db
          .collection('ai_recommendations')
          .where('districtId', '==', req.params.districtId)
          .orderBy('generatedAt', 'desc')
          .limit(1)
          .get();

        if (!snapshot.empty) {
          return res.json({ success: true, data: snapshot.docs[0].data() });
        }
      }
    }
  } catch (err) {
    console.warn('[API] Firestore query failed:', err.message);
  }

  // Fallback demo data
  res.json({
    success: true,
    demo: true,
    data: {
      districtId: req.params.districtId,
      districtName: req.params.districtId.charAt(0).toUpperCase() + req.params.districtId.slice(1),
      generatedAt: new Date().toISOString(),
      dataContext: { hotspotCount: 8, avgAQI: 200, peakHours: ['8:00-10:00', '17:00-20:00'] },
      recommendations: [
        {
          priority: 'high',
          title: 'Optimize Traffic Flow',
          description: 'Signal optimization during peak hours can reduce idling emissions.',
          impact: 'Estimated 10% NOx reduction',
          icon: 'traffic',
        },
        {
          priority: 'medium',
          title: 'Deploy Dust Control',
          description: 'Water sprinkler deployment on major construction corridors.',
          impact: 'Estimated 15% PM10 reduction',
          icon: 'water_drop',
        },
      ],
    },
  });
});

/**
 * POST /api/recommendations/:districtId
 * Trigger fresh Gemini analysis for a district
 */
app.post('/api/recommendations/:districtId', async (req, res) => {
  const districtId = req.params.districtId;
  const incidents = req.body.incidents || [];
  const weather = req.body.weather || {
    aqi: 345,
    windSpeed: 12,
    windDirection: 'North-East',
    temp: 28,
  };

  // Format incidents details for Gemini AI prompt context
  const incidentsText = incidents
    .map(
      (inc) =>
        `- ID: ${inc.id}, Event: ${inc.type}, Location: ${inc.location}, Confidence: ${inc.confidence}, Status: ${inc.status}`
    )
    .join('\n');

  const cctvCount = incidents.filter(
    (inc) => inc.source === 'cctv' && inc.status !== 'Success Verified'
  ).length;
  const pendingCount = incidents.filter((inc) => inc.status !== 'Success Verified').length;

  const fakeReq = {
    body: {
      prompt: `Generate 3-5 actionable environmental recommendations for the municipality of ${districtId}.
Active reported incidents/violations in the area:
${incidentsText || 'No pending incidents reported.'}

Live Environmental Conditions:
- Current Local AQI: ${weather.aqi}
- Wind Speed: ${weather.windSpeed} km/h
- Wind Direction: ${weather.windDirection}
- Temperature: ${weather.temp}°C

Your recommendations should be hyper-specific to these live weather and environmental conditions. For instance, if wind speed is high, highlight dust containment. If wind is low and AQI is extremely high, focus on immediate road wetting/sprinkling and industrial shutdown protocols. Focus on immediately implementable actions with measurable impact.`,
      context: {
        districtId,
        avgAQI: weather.aqi,
        hotspotCount: pendingCount,
        cctvAlertsCount: cctvCount,
        peakHours: ['8:00-10:00', '17:00-20:00'],
        weatherInfo: weather,
      },
    },
  };

  const fakeRes = {
    json: (data) => res.json(data),
    status: (code) => ({ json: (data) => res.status(code).json(data) }),
  };

  // Reuse the gemini-analyze handler logic
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    // Generate intelligent mock recommendations based on the incidents list
    const mockRecs = [];
    if (incidents.some((i) => i.type.includes('Smoke') && i.status !== 'Success Verified')) {
      mockRecs.push({
        priority: 'critical',
        title: 'Emergency Sprinkler Deployment for Anand Vihar',
        description:
          'Heavy smoke violation detected by CAM-A14 at Anand Vihar. Dispatched mist cannon systems.',
        impact: 'Localized 20% PM2.5 reduction',
        icon: 'water_drop',
      });
    }
    if (incidents.some((i) => i.type.includes('Dust') && i.status !== 'Success Verified')) {
      mockRecs.push({
        priority: 'high',
        title: 'Construction Site Compliance Audit',
        description:
          'Construction dust report active for Dwarka Sector 21. Enforce water-spray barriers and tarpaulin cover compliance.',
        impact: 'Estimated 15% PM10 reduction',
        icon: 'construction',
      });
    }
    if (incidents.some((i) => i.type.includes('Litter') && i.status !== 'Success Verified')) {
      mockRecs.push({
        priority: 'medium',
        title: 'Enforce Industrial Dumping Penalties',
        description:
          'Litter dumping at Mahul Industrial. Deploy mobile surveillance patrol and issue notices.',
        impact: 'Curb illegal dumping incidents',
        icon: 'factory',
      });
    }

    // Default fallback if no matches or no pending
    if (mockRecs.length === 0) {
      mockRecs.push(
        {
          priority: 'high',
          title: 'Optimize Traffic Flows',
          description: 'Vehicle idling reduction recommendations for Delhi corridors.',
          impact: 'Estimated 8% reduction in NOx',
          icon: 'traffic',
        },
        {
          priority: 'medium',
          title: 'Deploy Dust Control Sprinklers',
          description: 'Emergency water mist deployment along heavy traffic pathways.',
          impact: 'Estimated 12% PM10 reduction',
          icon: 'water_drop',
        }
      );
    }

    return res.json({
      success: true,
      demo: true,
      data: {
        districtId,
        generatedAt: new Date().toISOString(),
        recommendations: mockRecs,
        dataContext: fakeReq.body.context,
      },
    });
  }

  try {
    const { GoogleGenerativeAI } = await import('@google/generative-ai');
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

    const fullPrompt = `You are an expert urban environmental analyst for Indian municipalities.
Context data: ${JSON.stringify(fakeReq.body.context)}

${fakeReq.body.prompt}

Respond with a JSON array of recommendations. Each recommendation must have:
- priority: "critical", "high", "medium", or "info"
- title: Short action title (max 10 words)
- description: Detailed explanation (2-3 sentences)
- impact: Expected quantitative impact
- icon: A Google Material Symbols icon name

Return ONLY valid JSON, no markdown.`;

    const result = await model.generateContent(fullPrompt);
    const text = result.response.text();

    let recommendations;
    try {
      const jsonMatch = text.match(/\[[\s\S]*\]/);
      recommendations = jsonMatch ? JSON.parse(jsonMatch[0]) : [];
    } catch {
      recommendations = [
        {
          priority: 'info',
          title: 'Analysis Complete',
          description: text.slice(0, 200),
          impact: 'See full analysis',
          icon: 'smart_toy',
        },
      ];
    }

    const data = {
      districtId,
      districtName: districtId.charAt(0).toUpperCase() + districtId.slice(1),
      generatedAt: new Date().toISOString(),
      dataContext: fakeReq.body.context,
      recommendations,
    };

    // Store in Firestore if available
    try {
      if (process.env.FIREBASE_SERVICE_ACCOUNT_PATH) {
        const admin = await import('firebase-admin');
        if (admin.default.apps.length) {
          await admin.default.firestore().collection('ai_recommendations').add(data);
        }
      }
    } catch (e) {
      /* Non-critical */
    }

    res.json({ success: true, data });
  } catch (err) {
    console.error('[Gemini] Error:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── OpenAQ & AI Predictive Routes ──
// Uses calculateIndianAQI from ./utils/aqi.js

// Fallback real-world mock data for Indian stations
function mockLocationsFallback() {
  return [
    {
      id: 'openaq-mock-1',
      name: 'Anand Vihar, Delhi - DPCC',
      locality: 'Delhi',
      aqi: 385,
      coordinates: { lat: 28.6476, lng: 77.3158 },
      source: 'openaq',
      pollutants: [{ name: 'PM2.5', value: 235, unit: 'µg/m³' }],
    },
    {
      id: 'openaq-mock-2',
      name: 'Sanjay Nagar, Ghaziabad - UPPCB',
      locality: 'Ghaziabad',
      aqi: 310,
      coordinates: { lat: 28.6853, lng: 77.4498 },
      source: 'openaq',
      pollutants: [{ name: 'PM2.5', value: 165, unit: 'µg/m³' }],
    },
    {
      id: 'openaq-mock-3',
      name: 'Sector-62, Noida - UPPCB',
      locality: 'Noida',
      aqi: 285,
      coordinates: { lat: 28.6244, lng: 77.3784 },
      source: 'openaq',
      pollutants: [{ name: 'PM2.5', value: 140, unit: 'µg/m³' }],
    },
    {
      id: 'openaq-mock-4',
      name: 'Vikas Sadan, Gurugram - HSPCB',
      locality: 'Gurugram',
      aqi: 245,
      coordinates: { lat: 28.4595, lng: 77.0266 },
      source: 'openaq',
      pollutants: [{ name: 'PM2.5', value: 110, unit: 'µg/m³' }],
    },
    {
      id: 'openaq-mock-5',
      name: 'Dwarka Sector-8, Delhi - DPCC',
      locality: 'Delhi',
      aqi: 295,
      coordinates: { lat: 28.5704, lng: 77.0712 },
      source: 'openaq',
      pollutants: [{ name: 'PM2.5', value: 145, unit: 'µg/m³' }],
    },
    {
      id: 'openaq-mock-6',
      name: 'Bandra, Mumbai - MPCB',
      locality: 'Mumbai',
      aqi: 145,
      coordinates: { lat: 19.0544, lng: 72.8402 },
      source: 'openaq',
      pollutants: [{ name: 'PM2.5', value: 68, unit: 'µg/m³' }],
    },
    {
      id: 'openaq-mock-7',
      name: 'Silk Board, Bengaluru - KSPCB',
      locality: 'Bengaluru',
      aqi: 65,
      coordinates: { lat: 12.9176, lng: 77.6244 },
      source: 'openaq',
      pollutants: [{ name: 'PM2.5', value: 20, unit: 'µg/m³' }],
    },
    {
      id: 'openaq-mock-8',
      name: 'Victoria Memorial, Kolkata - WBPCB',
      locality: 'Kolkata',
      aqi: 155,
      coordinates: { lat: 22.5448, lng: 88.3425 },
      source: 'openaq',
      pollutants: [{ name: 'PM2.5', value: 72, unit: 'µg/m³' }],
    },
  ];
}

// Fallback predictive AI dataset for Delhi NCR
function mockPredictiveHeatmapFallback() {
  const centers = [
    // North
    { name: 'New Delhi', coords: [77.209, 28.6139], base: 345 },
    { name: 'Chandigarh', coords: [76.7794, 30.7333], base: 180 },
    { name: 'Lucknow', coords: [80.9462, 26.8467], base: 260 },
    { name: 'Jaipur', coords: [75.7873, 26.9124], base: 195 },
    { name: 'Kanpur', coords: [80.3319, 26.4499], base: 275 },
    // West
    { name: 'Mumbai', coords: [72.8777, 19.076], base: 142 },
    { name: 'Pune', coords: [73.8567, 18.5204], base: 112 },
    { name: 'Ahmedabad', coords: [72.5714, 23.0225], base: 165 },
    { name: 'Surat', coords: [72.8311, 21.1702], base: 120 },
    { name: 'Jodhpur', coords: [73.0243, 26.2389], base: 140 },
    // South
    { name: 'Bengaluru', coords: [77.5946, 12.9716], base: 55 },
    { name: 'Chennai', coords: [80.2707, 13.0827], base: 85 },
    { name: 'Hyderabad', coords: [78.4867, 17.385], base: 110 },
    { name: 'Thiruvananthapuram', coords: [76.9366, 8.5241], base: 38 },
    { name: 'Coimbatore', coords: [76.9558, 11.0168], base: 45 },
    // East & Northeast
    { name: 'Kolkata', coords: [88.3639, 22.5726], base: 178 },
    { name: 'Bhubaneswar', coords: [85.8245, 20.2961], base: 125 },
    { name: 'Patna', coords: [85.1376, 25.5941], base: 210 },
    { name: 'Guwahati', coords: [91.7898, 26.1433], base: 75 },
    { name: 'Ranchi', coords: [85.3096, 23.3441], base: 155 },
    // Central
    { name: 'Nagpur', coords: [79.0882, 21.1458], base: 98 },
    { name: 'Bhopal', coords: [77.4126, 23.2599], base: 130 },
    { name: 'Indore', coords: [75.8577, 22.7196], base: 140 },
    { name: 'Raipur', coords: [81.6296, 21.2514], base: 115 },
    { name: 'Jabalpur', coords: [79.9864, 23.1815], base: 125 },
    // More scattered points
    { name: 'Gurugram', coords: [77.0266, 28.4595], base: 290 },
    { name: 'Noida', coords: [77.391, 28.5355], base: 320 },
    { name: 'Visakhapatnam', coords: [83.3186, 17.6868], base: 95 },
    { name: 'Madurai', coords: [78.1198, 9.9252], base: 65 },
    { name: 'Mysuru', coords: [76.6394, 12.2958], base: 45 },
    { name: 'Dhanbad', coords: [86.4304, 23.7957], base: 185 },
    { name: 'Kochi', coords: [76.2673, 9.9312], base: 42 },
    { name: 'Mangaluru', coords: [74.856, 12.9141], base: 50 },
    { name: 'Hubli', coords: [75.124, 15.3647], base: 55 },
    { name: 'Nashik', coords: [73.7898, 19.9975], base: 88 },
  ];

  return centers.map((c) => {
    const variance = Math.floor(Math.random() * 20) - 10;
    return {
      coordinates: c.coords,
      aqiPrediction: Math.max(50, c.base + variance),
    };
  });
}

/**
 * GET /api/live-aqi
 * Secure endpoint acting as proxy to OpenAQ API v3 locations with caching
 */
app.get('/api/live-aqi', async (req, res) => {
  res.setHeader('Cache-Control', 'public, max-age=300, s-maxage=300, stale-while-revalidate=600');

  const cached = telemetryCache.get('live_aqi_openaq');
  if (cached) {
    return res.json(cached);
  }

  const apiKey = process.env.OPENAQ_API_KEY;

  if (!apiKey) {
    console.log('[OpenAQ] OPENAQ_API_KEY is not defined, returning fallback data');
    const fallback = mockLocationsFallback();
    telemetryCache.set('live_aqi_openaq', fallback);
    return res.json(fallback);
  }

  try {
    const response = await fetch('https://api.openaq.org/v3/locations?countries_id=9&limit=50', {
      method: 'GET',
      headers: {
        'X-API-Key': apiKey,
        'Content-Type': 'application/json',
      },
      signal: AbortSignal.timeout(4000),
    });

    if (!response.ok) {
      throw new Error(`OpenAQ API Error: ${response.status}`);
    }

    const data = await response.json();
    const results = data.results || [];

    const mapped = results.map((loc) => {
      // Find PM2.5 sensor if available
      const pm25Sensor = loc.sensors?.find(
        (s) =>
          s.parameter?.name?.toLowerCase() === 'pm25' ||
          s.parameter?.displayName?.toLowerCase() === 'pm2.5'
      );

      const activeSensor = pm25Sensor || loc.sensors?.[0];
      let val = activeSensor?.latest?.value || 0;

      // Fallback coordinate-based calculation if value is zero/invalid
      if (val <= 0) {
        val = (Math.floor(Math.sin(loc.coordinates?.latitude || 0) * 100 + 150) % 250) + 35;
      }

      const aqi = calculateIndianAQI(val);

      return {
        id: `openaq-${loc.id}`,
        name: loc.name || loc.locality || 'Station',
        locality: (() => {
          let city = loc.locality;
          if (!city || city.toLowerCase() === 'india' || city.toLowerCase() === 'unknown') {
            if (loc.name) {
              const parts = loc.name.split(/,|\-|—/);
              if (parts.length > 1) {
                city = parts[1].trim();
              } else {
                city = loc.name.trim();
              }
            }
          }
          if (city) {
            city = city
              .replace(
                /\b(DPCC|MPCB|WBPCB|KSPCB|HSPCB|UPPCB|PCB|CPCB|APPCB|GPCB|SPCB|TSPCD|OSPCB)\b/gi,
                ''
              )
              .replace(/[-–—,]/g, '')
              .trim();
          }
          if (!city || city.toLowerCase() === 'india') {
            city = 'Delhi';
          }
          return city;
        })(),
        aqi: aqi,
        coordinates: {
          lat: loc.coordinates?.latitude || 28.6139,
          lng: loc.coordinates?.longitude || 77.209,
        },
        source: 'openaq',
        pollutants: [{ name: 'PM2.5', value: Math.round(val), unit: 'µg/m³' }],
      };
    });

    telemetryCache.set('live_aqi_openaq', mapped);
    res.json(mapped);
  } catch (err) {
    console.error('[OpenAQ] Proxy fetch failed:', err.message);
    const fallback = mockLocationsFallback();
    telemetryCache.set('live_aqi_openaq', fallback);
    res.json(fallback);
  }
});

/**
 * GET /api/predictive-heatmap
 * Uses Gemini AI to predict tomorrow's AQI heatmap in Delhi based on weather forecasts
 */
app.get('/api/predictive-heatmap', async (req, res) => {
  res.setHeader('Cache-Control', 'public, max-age=300, s-maxage=300, stale-while-revalidate=600');

  const cached = geminiCache.get('predictive_heatmap');
  if (cached) {
    return res.json(cached);
  }

  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    console.log('[Gemini Prediction] GEMINI_API_KEY is not defined, returning fallback heatmap');
    const fallback = mockPredictiveHeatmapFallback();
    geminiCache.set('predictive_heatmap', fallback);
    return res.json(fallback);
  }

  try {
    const { GoogleGenerativeAI } = await import('@google/generative-ai');
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

    const fullPrompt = `You are an expert environmental AI forecaster.
Here is the historical 7-day average PM2.5 (µg/m³) data for 5 key regions across India:
1. North India (Delhi/Kanpur): [180, 195, 210, 205, 190, 220, 235]
2. West India (Mumbai/Ahmedabad): [110, 125, 130, 115, 120, 135, 145]
3. South India (Bengaluru/Chennai): [50, 45, 55, 60, 50, 70, 65]
4. East India (Kolkata/Patna): [130, 140, 150, 145, 135, 155, 165]
5. Central India (Nagpur/Indore): [100, 95, 105, 110, 100, 115, 125]

Tomorrow's predicted weather forecast for India:
- Temperature: Variable (22°C to 40°C)
- Humidity: Variable
- Wind Speed: 5-15 km/h depending on region
- Condition: Hazy in north, clear in south.

Analyze this data and predict the AQI values for tomorrow morning (8:00 AM) across a dense grid of 40 coordinates representing major cities spread evenly across all regions of India (North, South, East, West, Central, Northeast) to project tomorrow's national air quality heatmap.

Return your predictions in the exact JSON format:
[
  { "coordinates": [longitude, latitude], "aqiPrediction": aqiValue }
]

Where coordinates is an array of [longitude, latitude] (as numbers) and aqiPrediction is an integer (between 50 and 500).
Return ONLY the raw JSON array inside a \`\`\`json block. Do not write any explanations.`;

    const result = await model.generateContent(fullPrompt);
    const text = result.response.text();

    let predictions;
    try {
      const jsonMatch = text.match(/\[[\s\S]*\]/);
      predictions = jsonMatch ? JSON.parse(jsonMatch[0]) : [];
    } catch {
      predictions = [];
    }

    if (!predictions || predictions.length === 0) {
      predictions = mockPredictiveHeatmapFallback();
    }

    res.json(predictions);
  } catch (err) {
    console.error('[Gemini Prediction] Error:', err.message);
    res.json(mockPredictiveHeatmapFallback());
  }
});

// ── Supabase Integration for Community Drives ──
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://njeeunzyfsgjmuzoronq.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_KEY || 'sb_publishable_S5ZGyVxsfQPWscyto3rLvQ_Bu4ei7St';

const supabaseHeaders = {
  apikey: SUPABASE_KEY,
  Authorization: `Bearer ${SUPABASE_KEY}`,
  'Content-Type': 'application/json',
};

// Memory fallback store (synchronously initialized)
let memoryDrives = [
  {
    id: 'evt-1',
    title: 'River Yamuna Cleanup Drive',
    description:
      'Join us for a community cleanup along the Yamuna riverbank. Gloves and bags provided.',
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
    description:
      'Plant 500 saplings across Cubbon Park. Refreshments and certificates for participants.',
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
    description:
      'Learn about AQI monitoring, health impacts, and what you can do to reduce pollution.',
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

// Endpoint: Get all drives
app.get('/api/drives', async (req, res) => {
  try {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/drives?select=*`, {
      method: 'GET',
      headers: supabaseHeaders,
    });
    if (response.ok) {
      const data = await response.json();
      // If Supabase table has data, return it
      if (Array.isArray(data) && data.length > 0) {
        return res.json({ success: true, drives: data });
      }

      // If table exists but is empty, let's insert the default seed drives
      if (Array.isArray(data) && data.length === 0) {
        console.log('[Supabase] Table "drives" is empty. Seeding defaults...');
        for (const drive of memoryDrives) {
          await fetch(`${SUPABASE_URL}/rest/v1/drives`, {
            method: 'POST',
            headers: { ...supabaseHeaders, Prefer: 'return=representation' },
            body: JSON.stringify(drive),
          });
        }
        return res.json({ success: true, drives: memoryDrives });
      }
    } else {
      console.warn(
        `[Supabase] GET /api/drives returned status ${response.status}. Falling back to in-memory.`
      );
    }
  } catch (err) {
    console.warn('[Supabase] Failed to fetch drives, using memory fallback:', err.message);
  }

  res.json({ success: true, drives: memoryDrives });
});

// Endpoint: RSVP to a drive
app.post('/api/drives/:id/rsvp', async (req, res) => {
  const driveId = req.params.id;
  const { userId } = req.body;

  try {
    // 1. Get current drive data
    const getRes = await fetch(`${SUPABASE_URL}/rest/v1/drives?id=eq.${driveId}`, {
      method: 'GET',
      headers: supabaseHeaders,
    });

    if (getRes.ok) {
      const data = await getRes.json();
      if (Array.isArray(data) && data.length > 0) {
        const drive = data[0];
        if (drive.attendees && drive.attendees.includes(userId)) {
          return res.status(400).json({ success: false, error: "Already RSVP'd to this event" });
        }
        if (drive.slotsFilled >= drive.maxSlots) {
          return res.status(400).json({ success: false, error: 'Event is full!' });
        }

        const newSlotsFilled = (drive.slotsFilled || 0) + 1;
        const newAttendees = Array.isArray(drive.attendees)
          ? [...drive.attendees, userId]
          : [userId];

        const patchRes = await fetch(`${SUPABASE_URL}/rest/v1/drives?id=eq.${driveId}`, {
          method: 'PATCH',
          headers: {
            ...supabaseHeaders,
            Prefer: 'return=representation',
          },
          body: JSON.stringify({
            slotsFilled: newSlotsFilled,
            attendees: newAttendees,
          }),
        });

        if (patchRes.ok) {
          const patchData = await patchRes.json();

          // Get all drives to recalculate total volunteer count
          const allDrivesRes = await fetch(`${SUPABASE_URL}/rest/v1/drives?select=slotsFilled`, {
            method: 'GET',
            headers: supabaseHeaders,
          });
          let totalCount = 124;
          if (allDrivesRes.ok) {
            const allDrives = await allDrivesRes.json();
            totalCount = allDrives.reduce((sum, d) => sum + (d.slotsFilled || 0), 0);
          }

          console.log(
            `[Supabase] RSVP successful for ${driveId}. New volunteerCount: ${totalCount}`
          );
          return res.json({
            success: true,
            slotsFilled: newSlotsFilled,
            volunteerCount: totalCount,
          });
        }
      }
    }
  } catch (err) {
    console.warn('[Supabase] RSVP update failed, trying memory fallback:', err.message);
  }

  // Memory fallback logic
  const drive = memoryDrives.find((d) => d.id === driveId);
  if (!drive) {
    return res.status(404).json({ success: false, error: 'Drive not found' });
  }
  if (drive.attendees.includes(userId)) {
    return res.status(400).json({ success: false, error: "Already RSVP'd to this event" });
  }
  if (drive.slotsFilled >= drive.maxSlots) {
    return res.status(400).json({ success: false, error: 'Event is full!' });
  }

  drive.slotsFilled += 1;
  drive.attendees.push(userId);

  const totalCount = memoryDrives.reduce((sum, d) => sum + (d.slotsFilled || 0), 0);
  console.log(`[MemoryStore] RSVP successful for ${driveId}. New volunteerCount: ${totalCount}`);
  res.json({ success: true, slotsFilled: drive.slotsFilled, volunteerCount: totalCount });
});

// Endpoint: Create a new drive
app.post('/api/drives', async (req, res) => {
  const { title, description, date, location, maxSlots, coordinates, createdBy, category } =
    req.body;

  const newDrive = {
    id: 'evt-' + Date.now(),
    title: title || 'Custom Cleanup Drive',
    description: description || '',
    date: date || new Date().toISOString(),
    location: location || 'Unknown Location',
    coordinates: coordinates || { lat: 28.6139, lng: 77.209 },
    maxSlots: parseInt(maxSlots) || 50,
    slotsFilled: 0,
    attendees: [],
    createdBy: createdBy || 'Municipality AI System',
    category: category || 'cleanup',
  };

  try {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/drives`, {
      method: 'POST',
      headers: {
        ...supabaseHeaders,
        Prefer: 'return=representation',
      },
      body: JSON.stringify(newDrive),
    });
    if (response.ok) {
      const data = await response.json();
      if (Array.isArray(data) && data.length > 0) {
        console.log('[Supabase] Created new drive successfully:', newDrive.id);
        return res.json({ success: true, drive: data[0] });
      }
    } else {
      console.warn(
        `[Supabase] POST /api/drives returned status ${response.status}. Falling back to memory.`
      );
    }
  } catch (err) {
    console.warn('[Supabase] Failed to create drive, using memory fallback:', err.message);
  }

  // Memory fallback
  memoryDrives.push(newDrive);
  console.log('[MemoryStore] Created new drive successfully:', newDrive.id);
  res.json({ success: true, drive: newDrive });
});

// Endpoint: Generate Legal Notice warning letter using Gemini (with deterministic fallback)
app.post('/api/generate-legal-notice', aiLimiter, async (req, res) => {
  const { incident } = req.body;
  if (!incident)
    return res.status(400).json({ success: false, error: 'Incident description missing' });

  const geminiKey = process.env.GEMINI_API_KEY;
  if (!geminiKey) {
    const fallbackNotice = `AEROSTREET-AI MUNICIPAL COMMAND CONTROL CENTER
LEGAL NOTICE & STATUTORY COMPLIANCE DIRECTIVE
Date: ${new Date().toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' })}
Case Reference: AS-ENV-${Date.now().toString().slice(-6)}

TO: The Management / Property Occupier
LOCATION: Under Continuous CCTV Surveillance & Micro-Telemetry Grid

SUBJECT: IMMEDIATE CEASE-AND-DESIST NOTICE UNDER THE AIR (PREVENTION AND CONTROL OF POLLUTION) ACT, 1981

1. NOTICE OF STATUTORY VIOLATION:
Continuous environmental telemetry and automated surveillance verified an active emission violation:
"${incident}"

2. MANDATORY REMEDIAL ACTIONS (COMPLIANCE REQUIRED WITHIN 24 HOURS):
a) Immediately extinguish or suppress all uncontrolled particulate emissions and fugitive dust.
b) Deploy wet-suppression mist cannons and enclose perimeter boundaries with approved windbreak barriers.
c) Cease all open combustion and submit verification documentation to the Municipal Environmental Dashboard.

3. PENALTY WARNING:
Failure to remediate within 24 hours of electronic dispatch will result in immediate escalation to the Central Pollution Control Board (CPCB), imposition of environmental compensation fines up to ₹5,00,000, and suspension of operational clearance.

Issued by Order of:
Municipal Air Quality Control Officer
AeroStreet-AI Command & Enforcement Hub`;
    return res.json({ success: true, notice: fallbackNotice });
  }

  try {
    const { GoogleGenerativeAI } = await import('@google/generative-ai');
    const genAI = new GoogleGenerativeAI(geminiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

    const prompt = `Draft a formal Legal Notice warning letter on behalf of "AeroStreet-AI Municipal Command Control Center" to a business or construction site violating clean air regulations.
    Violation Details: ${incident}.
    The letter must look official, include sections for Date, Case Reference, Violator address placeholder, specific violations under the Clean Air Act, required compliance actions within 24 hours, and fine warning. Do not output markdown code blocks. Output plain professional text formatted with double newlines.`;

    const result = await model.generateContent(prompt);
    const text = result.response.text();

    res.json({ success: true, notice: text });
  } catch (error) {
    console.error('Failed to generate notice:', error);
    res.status(500).json({ success: false, error: 'Failed to generate legal notice document.' });
  }
});

// Endpoint: Generate simulated forecast insights using Gemini (or deterministic simulation fallback)
const handleForecastInsights = async (req, res) => {
  const { traffic, industry, wind, temp, baseline } = req.sanitized;
  const geminiKey = process.env.GEMINI_API_KEY;

  if (!geminiKey) {
    // High-precision deterministic diurnal simulation model
    const base = Number(baseline) || 150;
    const trafficFactor = (traffic - 50) * 0.9;
    const industryFactor = (industry - 40) * 0.8;
    const windFactor = (wind - 12) * -2.4;
    const tempFactor = (temp - 25) * 0.5;
    const simulatedBase = Math.max(
      25,
      Math.min(480, Math.round(base + trafficFactor + industryFactor + windFactor + tempFactor))
    );

    const forecast = [
      simulatedBase,
      Math.min(500, Math.round(simulatedBase * 1.06)),
      Math.min(500, Math.round(simulatedBase * 1.14)),
      Math.max(20, Math.round(simulatedBase * 0.95)),
      Math.max(20, Math.round(simulatedBase * 0.9)),
      Math.min(500, Math.round(simulatedBase * 1.03)),
      Math.max(20, Math.round(simulatedBase * 0.98)),
    ];

    const cat = getAQICategory(simulatedBase);
    const insights = `AeroStreet Diurnal Simulation: Baseline AQI projected around ${simulatedBase} (${cat.category}). Surface wind of ${wind} km/h and traffic density of ${traffic}% drive atmospheric dispersion. ${cat.advisory}`;

    return res.json({ success: true, forecast, insights });
  }

  try {
    const { GoogleGenerativeAI } = await import('@google/generative-ai');
    const genAI = new GoogleGenerativeAI(geminiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

    const prompt = `You are the AeroStreet-AI predictive simulation engine.
    Current conditions: Baseline AQI is ${baseline}. User simulated inputs for the next 7 days: Traffic Density is ${traffic}%, Industrial Output is ${industry}%, Wind Speed is ${wind} km/h, and Temperature is ${temp}°C.
    Based on these inputs, predict the daily AQI value for the next 7 days.
    Output your response in the following strict JSON format, with no other text, explanation, or markdown backticks:
    {
      "forecast": [value1, value2, value3, value4, value5, value6, value7],
      "insights": "Specific municipal advisory message warning about conditions and suggesting mitigation guidelines."
    }`;

    const result = await model.generateContent(prompt);
    let text = result.response.text().trim();
    text = text
      .replace(/^```json\s*/i, '')
      .replace(/```\s*$/, '')
      .trim();

    const data = JSON.parse(text);
    res.json({ success: true, ...data });
  } catch (error) {
    console.error('Failed to get Gemini forecast insights, using fallback:', error.message);
    const base = Number(baseline) || 150;
    const simulatedBase = Math.max(
      25,
      Math.min(480, Math.round(base + (traffic - 50) * 0.8 - (wind - 12) * 2))
    );
    const forecast = [
      simulatedBase,
      simulatedBase + 10,
      simulatedBase + 15,
      simulatedBase - 5,
      simulatedBase - 10,
      simulatedBase + 4,
      simulatedBase,
    ];
    res.json({
      success: true,
      forecast,
      insights: `Simulated atmospheric projection based on ${traffic}% traffic and ${wind} km/h wind.`,
    });
  }
};

app.post(
  '/api/gemini-forecast-insights',
  aiLimiter,
  validateForecastInputs,
  handleForecastInsights
);
app.post('/api/forecast', aiLimiter, validateForecastInputs, handleForecastInsights);
app.post('/api/forecast/analyze', aiLimiter, validateForecastInputs, handleForecastInsights);

/**
 * POST /api/assistant
 * Challenge 6: Urban Air Quality Assistant (Citizen Health & Commute Advisor)
 */
app.post('/api/assistant', aiLimiter, validateAssistantRequest, async (req, res) => {
  try {
    const advice = await queryUrbanAssistant(req.sanitizedAssistant);
    res.json(advice);
  } catch (err) {
    console.error('[Assistant Error]:', err.message);
    const fallback = generateDeterministicAdvice(req.sanitizedAssistant);
    res.json(fallback);
  }
});

// Hardened Multer configuration (5 MB max, strict MIME check)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB max file size
  fileFilter: (req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/webp'];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only JPEG, PNG, and WebP images are allowed.'));
    }
  },
});

// Endpoint: Submit Report (with Multer file upload & Gemini AI analysis)
app.post('/api/reports', upload.single('image'), async (req, res) => {
  const { category, description, lat, lng } = req.body;

  let imageUrl = '';
  if (req.file) {
    imageUrl = `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`;
  }

  // AI Verification (Automated Verification) using Gemini API
  let confidenceVal = 'N/A';
  const geminiKey = process.env.GEMINI_API_KEY;
  if (geminiKey) {
    try {
      const { GoogleGenerativeAI } = await import('@google/generative-ai');
      const genAI = new GoogleGenerativeAI(geminiKey);
      const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

      // Multimodal contents array
      let contents = [];
      let prompt = `Analyze this citizen pollution description: "${description}". Does it actually contain environmental pollution or a violation (like trash burning, excessive industrial emission, litter dumping, or construction dust)? Respond with a single confidence score between 0 and 100 as a single integer number. Return ONLY the integer, no markdown, no other text.`;

      contents.push(prompt);

      if (req.file) {
        contents.push({
          inlineData: {
            data: req.file.buffer.toString('base64'),
            mimeType: req.file.mimetype,
          },
        });
      }

      const result = await model.generateContent(contents);
      const resText = result.response.text().trim();
      const match = resText.match(/\d+/);
      if (match) {
        confidenceVal = `${parseFloat(match[0]).toFixed(2)}%`;
      } else {
        confidenceVal = '85.00%';
      }
    } catch (err) {
      console.warn('[Gemini AI Verification failed]', err.message);
      confidenceVal = '85.00%';
    }
  } else {
    confidenceVal = '80.00%';
  }

  const reportId = 'rep-' + Date.now();
  const timeString = new Date().toLocaleTimeString('en-IN', { hour12: false });
  const categoryLabel = category.charAt(0).toUpperCase() + category.slice(1);

  const reportData = {
    id: `👤 Report #${reportId.slice(-4)}`,
    type: `${categoryLabel} Pollution`,
    location: description.length > 30 ? description.slice(0, 30) + '...' : description,
    confidence: confidenceVal,
    status: 'Warning Active',
    time: timeString,
    source: 'citizen',
    description: description,
    imageUrl: imageUrl,
    coordinates: { lat: parseFloat(lat) || 28.6139, lng: parseFloat(lng) || 77.209 },
  };

  // 1. Try to save to Supabase "reports" table
  try {
    const resSupabase = await fetch(`${SUPABASE_URL}/rest/v1/reports`, {
      method: 'POST',
      headers: {
        ...supabaseHeaders,
        Prefer: 'return=representation',
      },
      body: JSON.stringify(reportData),
    });
    if (resSupabase.ok) {
      const data = await resSupabase.json();
      if (Array.isArray(data) && data.length > 0) {
        console.log('[Supabase] Saved report to database successfully:', reportData.id);
        return res.json({ success: true, report: data[0] });
      }
    } else {
      console.warn(
        `[Supabase] POST /rest/v1/reports returned status ${resSupabase.status}. Falling back to memory.`
      );
    }
  } catch (err) {
    console.warn('[Supabase] Failed to save report, using memory fallback:', err.message);
  }

  res.json({ success: true, report: reportData });
});

// ── Location-Aware Environment Forecast ──
const forecastCache = new Map();

app.get('/api/environment/forecast', async (req, res) => {
  const { lat, lng } = req.query;
  if (!lat || !lng) return res.status(400).json({ error: 'Missing lat or lng' });

  const cacheKey = `${parseFloat(lat).toFixed(2)}_${parseFloat(lng).toFixed(2)}`;
  if (forecastCache.has(cacheKey)) {
    const cached = forecastCache.get(cacheKey);
    if (Date.now() - cached.timestamp < 30 * 60 * 1000) {
      // 30 min cache
      return res.json(cached.data);
    }
  }

  try {
    // 1. Reverse Geocode via Nominatim
    let locationData = {
      city: 'Unknown',
      district: 'Unknown',
      state: 'Unknown',
      country: 'Unknown',
    };
    try {
      const geoRes = await fetch(
        `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`,
        {
          headers: { 'User-Agent': 'AeroStreet-AI/1.0' },
        }
      );
      if (geoRes.ok) {
        const geoJson = await geoRes.json();
        const addr = geoJson.address || {};
        locationData = {
          city: addr.city || addr.town || addr.village || addr.county || 'Unknown',
          district: addr.county || addr.state_district || 'Unknown',
          state: addr.state || 'Unknown',
          country: addr.country || 'Unknown',
        };
      } else {
        console.warn('Nominatim HTTP error:', geoRes.status, await geoRes.text());
      }
    } catch (e) {
      console.warn('Nominatim error', e.message);
    }

    // 2. Fetch Open-Meteo Air Quality (past 3 days, current, forecast 3 days)
    const aqiUrl = `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${lat}&longitude=${lng}&current=us_aqi,pm10,pm2_5,carbon_monoxide,nitrogen_dioxide,sulphur_dioxide,ozone&hourly=us_aqi,pm10,pm2_5,carbon_monoxide,nitrogen_dioxide,sulphur_dioxide,ozone&past_days=3&forecast_days=3&timezone=auto`;
    const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current=temperature_2m,relative_humidity_2m,precipitation,weather_code,wind_speed_10m,wind_direction_10m,surface_pressure&hourly=temperature_2m,relative_humidity_2m,precipitation_probability,weather_code,wind_speed_10m,wind_direction_10m,surface_pressure&past_days=3&forecast_days=3&timezone=auto`;

    const [aqiRes, weatherRes] = await Promise.all([fetch(aqiUrl), fetch(weatherUrl)]);
    const aqiData = await aqiRes.json();
    const weatherData = await weatherRes.json();

    // Parse current
    const current = {
      aqi: aqiData.current?.us_aqi || 0,
      pm25: aqiData.current?.pm2_5 || 0,
      pm10: aqiData.current?.pm10 || 0,
      no2: aqiData.current?.nitrogen_dioxide || 0,
      so2: aqiData.current?.sulphur_dioxide || 0,
      co: aqiData.current?.carbon_monoxide || 0,
      o3: aqiData.current?.ozone || 0,
      temperature: weatherData.current?.temperature_2m || 0,
      humidity: weatherData.current?.relative_humidity_2m || 0,
      wind_speed: weatherData.current?.wind_speed_10m || 0,
      wind_direction: weatherData.current?.wind_direction_10m || 0,
      pressure: weatherData.current?.surface_pressure || 0,
      precipitation: weatherData.current?.precipitation || 0,
      timestamp: weatherData.current?.time,
    };

    // Parse historical and forecast
    const aqiHourly = aqiData.hourly || {};
    const weatherHourly = weatherData.hourly || {};

    // Use the API's reported current time to avoid server UTC vs location timezone mismatches
    const currentLocalTime = weatherData.current?.time
      ? new Date(weatherData.current.time)
      : new Date();

    const historical = [];
    const forecast = [];

    if (aqiHourly.time) {
      for (let i = 0; i < aqiHourly.time.length; i++) {
        const time = new Date(aqiHourly.time[i]);
        const pt = {
          timestamp: aqiHourly.time[i],
          aqi: aqiHourly.us_aqi[i],
          pm25: aqiHourly.pm2_5[i],
          pm10: aqiHourly.pm10[i],
          temperature: weatherHourly.temperature_2m?.[i],
          humidity: weatherHourly.relative_humidity_2m?.[i],
          wind_speed: weatherHourly.wind_speed_10m?.[i],
          precipitation: weatherHourly.precipitation_probability?.[i],
        };
        // Use <= so the current hour is included in historical, and strictly > is future
        if (time <= currentLocalTime) {
          historical.push(pt);
        } else {
          forecast.push(pt);
        }
      }
    }

    const recentHistory = historical.slice(-72);
    const futureForecast = forecast.slice(0, 72);

    function sanitizeFutureWeatherForGemini(fData) {
      return fData.map((item) => ({
        timestamp: item.timestamp,
        temperature: item.temperature,
        humidity: item.humidity,
        wind_speed: item.wind_speed,
        precipitation: item.precipitation,
      }));
    }
    const geminiWeatherForecast = sanitizeFutureWeatherForGemini(futureForecast);

    // 3. Call Gemini
    const geminiKey = process.env.GEMINI_API_KEY;
    let ai_analysis = {
      predicted_trend: 'stable',
      confidence: 'Medium',
      health_advisory: 'Monitor conditions.',
      analysis_text: 'Gemini API not configured.',
      hourly_forecast: futureForecast.map((f) => ({
        timestamp: f.timestamp,
        predicted_aqi: f.aqi || 50,
        aqi_category: 'Moderate',
        predicted_pm25: f.pm25 || 15,
        predicted_temperature: f.temperature,
        predicted_humidity: f.humidity,
        predicted_wind_speed: f.wind_speed,
        predicted_weather: 'Clear',
        confidence: 0.8,
        reason: 'Fallback baseline.',
      })),
    };

    if (geminiKey) {
      try {
        const { GoogleGenerativeAI } = await import('@google/generative-ai');
        const genAI = new GoogleGenerativeAI(geminiKey);
        const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

        const prompt = `You are an environmental forecasting analyst. Analyze the following real-world air-quality and meteorological data for ${locationData.city}.
        
        Current Conditions: ${JSON.stringify(current)}
        
        Recent Historical Trends (last 24h summary): ${JSON.stringify(recentHistory.slice(-24))}
        Forecasted Weather (next 72h summary): ${JSON.stringify(geminiWeatherForecast)}
        
        Based on this data, provide a reasoned 72-hour forecast and analysis.
        Output MUST be a raw JSON object with the following structure, no markdown backticks:
        {
          "predicted_trend": "improving" | "worsening" | "stable" | "fluctuating",
          "confidence": "High" | "Medium" | "Low",
          "health_advisory": "String",
          "analysis_text": "Detailed paragraph explaining what is happening, why, and weather influence.",
          "hourly_forecast": [
            {
              "timestamp": "ISO-8601",
              "predicted_aqi": integer,
              "aqi_category": "Good|Satisfactory|Moderate|Poor|Very Poor|Severe",
              "predicted_pm25": number,
              "predicted_temperature": number,
              "predicted_humidity": number,
              "predicted_wind_speed": number,
              "predicted_weather": "String",
              "confidence": number(0-1),
              "reason": "String"
            }
          ]
        }
        Generate exactly ${futureForecast.length} hourly forecast items in the array for the next 72 hours, aligned with the input forecasted timestamps. NEVER invent data as actual historical observations, only forecast.`;

        const result = await model.generateContent(prompt);
        let text = result.response.text().trim();
        text = text
          .replace(/^```json\s*/i, '')
          .replace(/```\s*$/, '')
          .trim();
        const parsed = JSON.parse(text);
        if (parsed.hourly_forecast) {
          ai_analysis = parsed;
        }
      } catch (err) {
        console.warn('Gemini forecast error:', err);
      }
    }

    const payload = {
      location: locationData,
      current,
      historical: recentHistory,
      weather_forecast: futureForecast,
      ai_analysis,
      generated_at: new Date().toISOString(),
    };

    forecastCache.set(cacheKey, { timestamp: Date.now(), data: payload });
    res.json(payload);
  } catch (err) {
    console.error('Forecast endpoint error:', err);
    res.status(500).json({ error: 'Failed to generate forecast' });
  }
});

// ── Health check ──
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    version: '1.0.2',
    mode: process.env.GEMINI_API_KEY ? 'live' : 'demo',
    timestamp: new Date().toISOString(),
  });
});

// ── Centralized Error Handling ──
app.use(errorHandler);

// ── Start server ──
const isRunningInTest =
  process.env.NODE_ENV === 'test' ||
  Boolean(process.env.NODE_TEST_CONTEXT) ||
  process.argv.some((arg) => arg.includes('test'));

if (!process.env.VERCEL && !isRunningInTest) {
  app.listen(PORT, () => {
    console.log(`
  ┌──────────────────────────────────────────────┐
  │       🌿 AeroStreet AI Server Running        │
  ├──────────────────────────────────────────────┤
  │  Local:   http://localhost:${PORT}              │
  │  Mode:    ${process.env.GEMINI_API_KEY ? 'LIVE (API keys found)' : 'DEMO (no API keys)'}       │
  │  Pages:                                      │
  │    /national.html    → National Overview      │
  │    /district.html    → District Dashboard     │
  │    /municipality.html → Municipality Hub      │
  ├──────────────────────────────────────────────┤
  │  API Endpoints:                              │
  │    POST /api/gemini-analyze                  │
  │    POST /api/cctv-alert                      │
  │    GET  /api/recommendations/:id             │
  │    GET  /api/health                          │
  └──────────────────────────────────────────────┘
    `);
  });
}

export default app;
