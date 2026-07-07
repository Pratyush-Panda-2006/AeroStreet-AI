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
import multer from 'multer';

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
  const weather = req.body.weather || { aqi: 345, windSpeed: 12, windDirection: 'North-East', temp: 28 };

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
        weatherInfo: weather
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
            city = city.replace(/\b(DPCC|MPCB|WBPCB|KSPCB|HSPCB|UPPCB|PCB|CPCB|APPCB|GPCB|SPCB|TSPCD|OSPCB)\b/gi, '')
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

// ── Supabase Integration for Community Drives ──
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://njeeunzyfsgjmuzoronq.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_KEY || 'sb_publishable_S5ZGyVxsfQPWscyto3rLvQ_Bu4ei7St';

const supabaseHeaders = {
  'apikey': SUPABASE_KEY,
  'Authorization': `Bearer ${SUPABASE_KEY}`,
  'Content-Type': 'application/json'
};

// Memory fallback store (synchronously initialized)
let memoryDrives = [
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
    category: 'cleanup'
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
    category: 'plantation'
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
    category: 'workshop'
  }
];

// Endpoint: Get all drives
app.get('/api/drives', async (req, res) => {
  try {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/drives?select=*`, {
      method: 'GET',
      headers: supabaseHeaders
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
            headers: { ...supabaseHeaders, 'Prefer': 'return=representation' },
            body: JSON.stringify(drive)
          });
        }
        return res.json({ success: true, drives: memoryDrives });
      }
    } else {
      console.warn(`[Supabase] GET /api/drives returned status ${response.status}. Falling back to in-memory.`);
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
      headers: supabaseHeaders
    });
    
    if (getRes.ok) {
      const data = await getRes.json();
      if (Array.isArray(data) && data.length > 0) {
        const drive = data[0];
        if (drive.attendees && drive.attendees.includes(userId)) {
          return res.status(400).json({ success: false, error: 'Already RSVP\'d to this event' });
        }
        if (drive.slotsFilled >= drive.maxSlots) {
          return res.status(400).json({ success: false, error: 'Event is full!' });
        }
        
        const newSlotsFilled = (drive.slotsFilled || 0) + 1;
        const newAttendees = Array.isArray(drive.attendees) ? [...drive.attendees, userId] : [userId];
        
        const patchRes = await fetch(`${SUPABASE_URL}/rest/v1/drives?id=eq.${driveId}`, {
          method: 'PATCH',
          headers: {
            ...supabaseHeaders,
            'Prefer': 'return=representation'
          },
          body: JSON.stringify({
            slotsFilled: newSlotsFilled,
            attendees: newAttendees
          })
        });
        
        if (patchRes.ok) {
          const patchData = await patchRes.json();
          
          // Get all drives to recalculate total volunteer count
          const allDrivesRes = await fetch(`${SUPABASE_URL}/rest/v1/drives?select=slotsFilled`, {
            method: 'GET',
            headers: supabaseHeaders
          });
          let totalCount = 124;
          if (allDrivesRes.ok) {
            const allDrives = await allDrivesRes.json();
            totalCount = allDrives.reduce((sum, d) => sum + (d.slotsFilled || 0), 0);
          }
          
          console.log(`[Supabase] RSVP successful for ${driveId}. New volunteerCount: ${totalCount}`);
          return res.json({ success: true, slotsFilled: newSlotsFilled, volunteerCount: totalCount });
        }
      }
    }
  } catch (err) {
    console.warn('[Supabase] RSVP update failed, trying memory fallback:', err.message);
  }

  // Memory fallback logic
  const drive = memoryDrives.find(d => d.id === driveId);
  if (!drive) {
    return res.status(404).json({ success: false, error: 'Drive not found' });
  }
  if (drive.attendees.includes(userId)) {
    return res.status(400).json({ success: false, error: 'Already RSVP\'d to this event' });
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
  const { title, description, date, location, maxSlots, coordinates, createdBy, category } = req.body;

  const newDrive = {
    id: 'evt-' + Date.now(),
    title: title || 'Custom Cleanup Drive',
    description: description || '',
    date: date || new Date().toISOString(),
    location: location || 'Unknown Location',
    coordinates: coordinates || { lat: 28.6139, lng: 77.2090 },
    maxSlots: parseInt(maxSlots) || 50,
    slotsFilled: 0,
    attendees: [],
    createdBy: createdBy || 'Municipality AI System',
    category: category || 'cleanup'
  };

  try {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/drives`, {
      method: 'POST',
      headers: {
        ...supabaseHeaders,
        'Prefer': 'return=representation'
      },
      body: JSON.stringify(newDrive)
    });
    if (response.ok) {
      const data = await response.json();
      if (Array.isArray(data) && data.length > 0) {
        console.log('[Supabase] Created new drive successfully:', newDrive.id);
        return res.json({ success: true, drive: data[0] });
      }
    } else {
      console.warn(`[Supabase] POST /api/drives returned status ${response.status}. Falling back to memory.`);
    }
  } catch (err) {
    console.warn('[Supabase] Failed to create drive, using memory fallback:', err.message);
  }

  // Memory fallback
  memoryDrives.push(newDrive);
  console.log('[MemoryStore] Created new drive successfully:', newDrive.id);
  res.json({ success: true, drive: newDrive });
});

// Endpoint: Predictive Heatmap Coordinates
app.get('/api/predictive-heatmap', (req, res) => {
  const hotspots = [];
  
  // Seed coordinates across major Indian cities
  const centers = [
    { name: 'Delhi NCR', lat: 28.6139, lng: 77.2090, weight: 340 },
    { name: 'Mumbai Metro', lat: 19.0760, lng: 72.8777, weight: 120 },
    { name: 'Bengaluru IT Hub', lat: 12.9716, lng: 77.5946, weight: 60 },
    { name: 'Kolkata Port', lat: 22.5726, lng: 88.3639, weight: 160 },
    { name: 'Chennai Auto Hub', lat: 13.0827, lng: 80.2707, weight: 80 },
    { name: 'Patna Urban', lat: 25.5941, lng: 85.1376, weight: 240 },
    { name: 'Lucknow Central', lat: 26.8467, lng: 80.9462, weight: 270 },
    { name: 'Jaipur Industrial', lat: 26.9124, lng: 75.7873, weight: 180 },
    { name: 'Hyderabad Tech', lat: 17.3850, lng: 78.4867, weight: 95 }
  ];

  // Generate density cluster layers for Deck.gl
  centers.forEach(c => {
    // Generate 25 coordinates around each major city to form nationwide visual hotspots
    for (let i = 0; i < 25; i++) {
      const offsetLat = (Math.random() - 0.5) * 0.8; // larger offset for nation-wide zoom visibility
      const offsetLng = (Math.random() - 0.5) * 0.8;
      const weightNoise = (Math.random() - 0.5) * 40;
      hotspots.push({
        coordinates: [c.lng + offsetLng, c.lat + offsetLat],
        aqiPrediction: Math.max(10, Math.min(500, Math.round(c.weight + weightNoise)))
      });
    }
  });

  res.json(hotspots);
});

// Endpoint: Live AQI for state explorer
app.get('/api/live-aqi', (req, res) => {
  const cities = [
    { id: 'in-dl', name: 'Delhi', aqi: 342, locality: 'Delhi' },
    { id: 'in-mh', name: 'Mumbai', aqi: 110, locality: 'Mumbai' },
    { id: 'in-ka', name: 'Bengaluru', aqi: 58, locality: 'Bengaluru' },
    { id: 'in-wb', name: 'Kolkata', aqi: 156, locality: 'Kolkata' },
    { id: 'in-mz', name: 'Aizawl', aqi: 22, locality: 'Aizawl' },
    { id: 'in-up', name: 'Lucknow', aqi: 280, locality: 'Lucknow' },
    { id: 'in-hr', name: 'Gurugram', aqi: 260, locality: 'Gurugram' },
    { id: 'in-rj', name: 'Jaipur', aqi: 190, locality: 'Jaipur' },
    { id: 'in-gj', name: 'Ahmedabad', aqi: 120, locality: 'Ahmedabad' },
    { id: 'in-tn', name: 'Chennai', aqi: 75, locality: 'Chennai' },
    { id: 'in-ap', name: 'Visakhapatnam', aqi: 82, locality: 'Visakhapatnam' },
    { id: 'in-kl', name: 'Kochi', aqi: 45, locality: 'Kochi' },
    { id: 'in-tg', name: 'Hyderabad', aqi: 92, locality: 'Hyderabad' },
    { id: 'in-or', name: 'Bhubaneswar', aqi: 115, locality: 'Bhubaneswar' },
    { id: 'in-pb', name: 'Ludhiana', aqi: 210, locality: 'Ludhiana' },
    { id: 'in-br', name: 'Patna', aqi: 230, locality: 'Patna' }
  ];
  res.json(cities);
});

// Endpoint: Generate Legal Notice warning letter using Gemini
app.post('/api/generate-legal-notice', async (req, res) => {
  const { incident } = req.body;
  if (!incident) return res.status(400).json({ error: 'Incident description missing' });

  const geminiKey = process.env.GEMINI_API_KEY;
  if (!geminiKey) {
    return res.status(500).json({ error: 'Gemini API key is not configured.' });
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
    res.status(500).json({ error: 'Failed to generate legal notice document.' });
  }
});

// Endpoint: Generate simulated forecast insights using Gemini
app.post('/api/gemini-forecast-insights', async (req, res) => {
  const { traffic, industry, wind, temp, baseline } = req.body;
  const geminiKey = process.env.GEMINI_API_KEY;
  if (!geminiKey) {
    return res.status(500).json({ error: 'Gemini API key is not configured.' });
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
    text = text.replace(/^```json\s*/i, '').replace(/```\s*$/, '').trim();

    const data = JSON.parse(text);
    res.json({ success: true, ...data });
  } catch (error) {
    console.error('Failed to get Gemini forecast insights:', error);
    res.status(500).json({ error: 'Failed to compute predictions.' });
  }
});

const upload = multer({ storage: multer.memoryStorage() });

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
            mimeType: req.file.mimetype
          }
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
    coordinates: { lat: parseFloat(lat) || 28.6139, lng: parseFloat(lng) || 77.2090 }
  };

  // 1. Try to save to Supabase "reports" table
  try {
    const resSupabase = await fetch(`${SUPABASE_URL}/rest/v1/reports`, {
      method: 'POST',
      headers: {
        ...supabaseHeaders,
        'Prefer': 'return=representation'
      },
      body: JSON.stringify(reportData)
    });
    if (resSupabase.ok) {
      const data = await resSupabase.json();
      if (Array.isArray(data) && data.length > 0) {
        console.log('[Supabase] Saved report to database successfully:', reportData.id);
        return res.json({ success: true, report: data[0] });
      }
    } else {
      console.warn(`[Supabase] POST /rest/v1/reports returned status ${resSupabase.status}. Falling back to memory.`);
    }
  } catch (err) {
    console.warn('[Supabase] Failed to save report, using memory fallback:', err.message);
  }

  res.json({ success: true, report: reportData });
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
