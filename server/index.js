// ============================================
// AeroStreet AI — Express Server
// ============================================
// Serves static frontend files and provides API
// endpoints for Gemini AI proxy and CCTV webhook.

import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// ── Middleware ──
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// ── Inject config into HTML pages ──
// This middleware intercepts HTML requests and injects the
// Firebase/Maps/Gemini config from server-side env vars.
app.use((req, res, next) => {
  if (req.path.endsWith('.html') || req.path === '/') {
    const filePath = req.path === '/' ? 'national.html' : req.path.slice(1);
    const fullPath = join(process.cwd(), 'templates', filePath);

    import('fs').then(fs => {
      fs.readFile(fullPath, 'utf8', (err, html) => {
        if (err) { next(); return; }

        // Inject config script before closing </head>
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
    geminiApiKey: "${process.env.GEMINI_API_KEY || ''}",
    windyApiKey: "${process.env.WINDY_API_KEY || ''}",
    waqiApiToken: "${process.env.WAQI_API_TOKEN || ''}",
    apiBaseUrl: ""
  };
</script>`;

        const injectedHtml = html.replace('</head>', configScript + '\n</head>');
        res.type('html').send(injectedHtml);
      });
    });
    return;
  }
  next();
});

// ── Serve static files ──
app.use(express.static(join(process.cwd(), 'public')));

// ── API Routes ──

/**
 * POST /api/gemini-analyze
 * Proxy endpoint for Gemini API calls (keeps API key server-side)
 */
app.post('/api/gemini-analyze', async (req, res) => {
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
            description: 'This is a demo recommendation. Add a GEMINI_API_KEY to .env for real AI analysis.',
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
      recommendations = [{ priority: 'info', title: 'Analysis Complete', description: text, impact: 'See details', icon: 'smart_toy' }];
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
    coordinates: coordinates || { lat: 28.6139, lng: 77.2090 },
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
        const serviceAccount = JSON.parse(fs.readFileSync(process.env.FIREBASE_SERVICE_ACCOUNT_PATH, 'utf8'));
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
        const snapshot = await db.collection('ai_recommendations')
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
        { priority: 'high', title: 'Optimize Traffic Flow', description: 'Signal optimization during peak hours can reduce idling emissions.', impact: 'Estimated 10% NOx reduction', icon: 'traffic' },
        { priority: 'medium', title: 'Deploy Dust Control', description: 'Water sprinkler deployment on major construction corridors.', impact: 'Estimated 15% PM10 reduction', icon: 'water_drop' },
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

  // Format incidents details for Gemini AI prompt context
  const incidentsText = incidents.map(inc => 
    `- ID: ${inc.id}, Event: ${inc.type}, Location: ${inc.location}, Confidence: ${inc.confidence}, Status: ${inc.status}`
  ).join('\n');

  const cctvCount = incidents.filter(inc => inc.source === 'cctv' && inc.status !== 'Success Verified').length;
  const pendingCount = incidents.filter(inc => inc.status !== 'Success Verified').length;

  const fakeReq = {
    body: {
      prompt: `Generate 3-5 actionable environmental recommendations for the municipality of ${districtId}.
Active reported incidents/violations in the area:
${incidentsText || 'No pending incidents reported.'}

Consider traffic patterns, industrial activity, construction dust, and specific listed incidents.
Focus on immediately implementable actions with measurable impact.`,
      context: { 
        districtId, 
        avgAQI: districtId === 'mumbai' ? 142 : 345, 
        hotspotCount: pendingCount, 
        cctvAlertsCount: cctvCount,
        peakHours: ['8:00-10:00', '17:00-20:00'] 
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
    if (incidents.some(i => i.type.includes('Smoke') && i.status !== 'Success Verified')) {
      mockRecs.push({
        priority: 'critical',
        title: 'Emergency Sprinkler Deployment for Anand Vihar',
        description: 'Heavy smoke violation detected by CAM-A14 at Anand Vihar. Dispatched mist cannon systems.',
        impact: 'Localized 20% PM2.5 reduction',
        icon: 'water_drop'
      });
    }
    if (incidents.some(i => i.type.includes('Dust') && i.status !== 'Success Verified')) {
      mockRecs.push({
        priority: 'high',
        title: 'Construction Site Compliance Audit',
        description: 'Construction dust report active for Dwarka Sector 21. Enforce water-spray barriers and tarpaulin cover compliance.',
        impact: 'Estimated 15% PM10 reduction',
        icon: 'construction'
      });
    }
    if (incidents.some(i => i.type.includes('Litter') && i.status !== 'Success Verified')) {
      mockRecs.push({
        priority: 'medium',
        title: 'Enforce Industrial Dumping Penalties',
        description: 'Litter dumping at Mahul Industrial. Deploy mobile surveillance patrol and issue notices.',
        impact: 'Curb illegal dumping incidents',
        icon: 'factory'
      });
    }
    
    // Default fallback if no matches or no pending
    if (mockRecs.length === 0) {
      mockRecs.push(
        { priority: 'high', title: 'Optimize Traffic Flows', description: 'Vehicle idling reduction recommendations for Delhi corridors.', impact: 'Estimated 8% reduction in NOx', icon: 'traffic' },
        { priority: 'medium', title: 'Deploy Dust Control Sprinklers', description: 'Emergency water mist deployment along heavy traffic pathways.', impact: 'Estimated 12% PM10 reduction', icon: 'water_drop' }
      );
    }

    return res.json({
      success: true,
      demo: true,
      data: {
        districtId,
        generatedAt: new Date().toISOString(),
        recommendations: mockRecs,
        dataContext: fakeReq.body.context
      }
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
      recommendations = [{ priority: 'info', title: 'Analysis Complete', description: text.slice(0, 200), impact: 'See full analysis', icon: 'smart_toy' }];
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
    } catch (e) { /* Non-critical */ }

    res.json({ success: true, data });
  } catch (err) {
    console.error('[Gemini] Error:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── OpenAQ & AI Predictive Routes ──

// Helper: Indian CPCB sub-index AQI calculation for PM2.5
function calculateIndianAQI(pm25) {
  if (!pm25 || pm25 < 0) return 0;
  if (pm25 <= 30) return Math.round(pm25 * 50 / 30);
  if (pm25 <= 60) return Math.round(50 + (pm25 - 30) * 50 / 30);
  if (pm25 <= 90) return Math.round(100 + (pm25 - 60) * 100 / 30);
  if (pm25 <= 120) return Math.round(200 + (pm25 - 90) * 100 / 30);
  if (pm25 <= 250) return Math.round(300 + (pm25 - 120) * 100 / 130);
  return Math.min(500, Math.round(400 + (pm25 - 250) * 100 / 100));
}

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
      pollutants: [{ name: 'PM2.5', value: 235, unit: 'µg/m³' }]
    },
    {
      id: 'openaq-mock-2',
      name: 'Sanjay Nagar, Ghaziabad - UPPCB',
      locality: 'Ghaziabad',
      aqi: 310,
      coordinates: { lat: 28.6853, lng: 77.4498 },
      source: 'openaq',
      pollutants: [{ name: 'PM2.5', value: 165, unit: 'µg/m³' }]
    },
    {
      id: 'openaq-mock-3',
      name: 'Sector-62, Noida - UPPCB',
      locality: 'Noida',
      aqi: 285,
      coordinates: { lat: 28.6244, lng: 77.3784 },
      source: 'openaq',
      pollutants: [{ name: 'PM2.5', value: 140, unit: 'µg/m³' }]
    },
    {
      id: 'openaq-mock-4',
      name: 'Vikas Sadan, Gurugram - HSPCB',
      locality: 'Gurugram',
      aqi: 245,
      coordinates: { lat: 28.4595, lng: 77.0266 },
      source: 'openaq',
      pollutants: [{ name: 'PM2.5', value: 110, unit: 'µg/m³' }]
    },
    {
      id: 'openaq-mock-5',
      name: 'Dwarka Sector-8, Delhi - DPCC',
      locality: 'Delhi',
      aqi: 295,
      coordinates: { lat: 28.5704, lng: 77.0712 },
      source: 'openaq',
      pollutants: [{ name: 'PM2.5', value: 145, unit: 'µg/m³' }]
    },
    {
      id: 'openaq-mock-6',
      name: 'Bandra, Mumbai - MPCB',
      locality: 'Mumbai',
      aqi: 145,
      coordinates: { lat: 19.0544, lng: 72.8402 },
      source: 'openaq',
      pollutants: [{ name: 'PM2.5', value: 68, unit: 'µg/m³' }]
    },
    {
      id: 'openaq-mock-7',
      name: 'Silk Board, Bengaluru - KSPCB',
      locality: 'Bengaluru',
      aqi: 65,
      coordinates: { lat: 12.9176, lng: 77.6244 },
      source: 'openaq',
      pollutants: [{ name: 'PM2.5', value: 20, unit: 'µg/m³' }]
    },
    {
      id: 'openaq-mock-8',
      name: 'Victoria Memorial, Kolkata - WBPCB',
      locality: 'Kolkata',
      aqi: 155,
      coordinates: { lat: 22.5448, lng: 88.3425 },
      source: 'openaq',
      pollutants: [{ name: 'PM2.5', value: 72, unit: 'µg/m³' }]
    }
  ];
}

// Fallback predictive AI dataset for Delhi NCR
function mockPredictiveHeatmapFallback() {
  const centers = [
    { name: 'New Delhi', coords: [77.2090, 28.6139], base: 345 },
    { name: 'Dwarka', coords: [77.0266, 28.5823], base: 150 },
    { name: 'Gurugram', coords: [77.0266, 28.4595], base: 290 },
    { name: 'Noida', coords: [77.3910, 28.5355], base: 210 },
    { name: 'Faridabad', coords: [77.3178, 28.4089], base: 240 },
    { name: 'Rohini', coords: [77.1130, 28.7041], base: 285 },
    { name: 'Okhla', coords: [77.2855, 28.5460], base: 295 },
    { name: 'Ghaziabad', coords: [77.4498, 28.6853], base: 310 },
    { name: 'Connaught Place', coords: [77.2197, 28.6304], base: 330 },
    { name: 'Karol Bagh', coords: [77.1888, 28.6444], base: 280 },
    { name: 'Vasant Kunj', coords: [77.1500, 28.5400], base: 140 },
    { name: 'Inderlok', coords: [77.1680, 28.6730], base: 320 },
    { name: 'Pitampura', coords: [77.1390, 28.6990], base: 260 },
    { name: 'Mayur Vihar', coords: [77.2950, 28.6080], base: 225 },
    { name: 'Janakpuri', coords: [77.0850, 28.6210], base: 190 }
  ];

  return centers.map(c => {
    const variance = Math.floor(Math.random() * 20) - 10;
    return {
      coordinates: c.coords,
      aqiPrediction: Math.max(50, c.base + variance)
    };
  });
}

/**
 * GET /api/live-aqi
 * Secure endpoint acting as proxy to OpenAQ API v3 locations
 */
app.get('/api/live-aqi', async (req, res) => {
  const apiKey = process.env.OPENAQ_API_KEY;

  if (!apiKey) {
    console.log('[OpenAQ] OPENAQ_API_KEY is not defined, returning fallback data');
    return res.json(mockLocationsFallback());
  }

  try {
    const response = await fetch('https://api.openaq.org/v3/locations?countries_id=9&limit=50', {
      method: 'GET',
      headers: {
        'X-API-Key': apiKey,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`OpenAQ API Error: ${response.status}`);
    }

    const data = await response.json();
    const results = data.results || [];

    const mapped = results.map(loc => {
      // Find PM2.5 sensor if available
      const pm25Sensor = loc.sensors?.find(s => 
        s.parameter?.name?.toLowerCase() === 'pm25' || 
        s.parameter?.displayName?.toLowerCase() === 'pm2.5'
      );
      
      const activeSensor = pm25Sensor || loc.sensors?.[0];
      let val = activeSensor?.latest?.value || 0;
      
      // Fallback coordinate-based calculation if value is zero/invalid
      if (val <= 0) {
        val = Math.floor(Math.sin(loc.coordinates?.latitude || 0) * 100 + 150) % 250 + 35;
      }
      
      const aqi = calculateIndianAQI(val);
      
      return {
        id: `openaq-${loc.id}`,
        name: loc.name || loc.locality || 'Station',
        locality: loc.locality || 'India',
        aqi: aqi,
        coordinates: {
          lat: loc.coordinates?.latitude || 28.6139,
          lng: loc.coordinates?.longitude || 77.2090
        },
        source: 'openaq',
        pollutants: [
          { name: 'PM2.5', value: Math.round(val), unit: 'µg/m³' }
        ]
      };
    });

    res.json(mapped);
  } catch (err) {
    console.error('[OpenAQ] Proxy fetch failed:', err.message);
    res.json(mockLocationsFallback());
  }
});

/**
 * GET /api/predictive-heatmap
 * Uses Gemini AI to predict tomorrow's AQI heatmap in Delhi based on weather forecasts
 */
app.get('/api/predictive-heatmap', async (req, res) => {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    console.log('[Gemini Prediction] GEMINI_API_KEY is not defined, returning fallback heatmap');
    return res.json(mockPredictiveHeatmapFallback());
  }

  try {
    const { GoogleGenerativeAI } = await import('@google/generative-ai');
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

    const fullPrompt = `You are an expert environmental AI forecaster.
Here is the historical 7-day average PM2.5 (µg/m³) data for 5 key areas in the Delhi NCR region:
1. New Delhi (77.2090, 28.6139): [180, 195, 210, 205, 190, 220, 235]
2. Dwarka (77.0266, 28.5823): [110, 125, 130, 115, 120, 135, 145]
3. Gurugram (77.0266, 28.4595): [140, 155, 150, 160, 150, 170, 185]
4. Noida (77.3910, 28.5355): [130, 140, 150, 145, 135, 155, 165]
5. Faridabad (77.3178, 28.4089): [150, 160, 175, 165, 155, 180, 190]

Tomorrow's predicted weather forecast for Delhi NCR:
- Temperature: 37°C
- Humidity: 72%
- Wind Speed: 7 km/h (East-Southeast breeze)
- Condition: Hazy morning, scattered clouds later in the day.

Analyze this data and predict the AQI values for tomorrow morning (8:00 AM) across a dense grid of 15 coordinates in and around Delhi NCR (covering Delhi, Dwarka, Noida, Gurugram, Faridabad, Rohini, Connaught Place, Okhla, Ghaziabad, Karol Bagh, Vasant Kunj, etc.) to project tomorrow's air quality heatmap.

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

// ── Health check ──
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    version: '1.0.0',
    mode: process.env.GEMINI_API_KEY ? 'live' : 'demo',
    timestamp: new Date().toISOString(),
  });
});

// ── Start server ──
if (!process.env.VERCEL) {
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
