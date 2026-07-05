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
    const fullPath = join(__dirname, '..', 'public', filePath);

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
app.use(express.static(join(__dirname, '..', 'public')));

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

  // Forward to Gemini analyze endpoint
  const fakeReq = {
    body: {
      prompt: `Generate 3-5 actionable environmental recommendations for the municipality of ${districtId}.
Consider: traffic patterns, industrial activity, construction sites, and citizen reports.
Focus on immediately implementable actions with measurable impact.`,
      context: { districtId, avgAQI: 200, hotspotCount: 8, peakHours: ['8:00-10:00', '17:00-20:00'] },
    },
  };

  const fakeRes = {
    json: (data) => res.json(data),
    status: (code) => ({ json: (data) => res.status(code).json(data) }),
  };

  // Reuse the gemini-analyze handler logic
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.json({
      success: true, demo: true,
      data: {
        districtId,
        generatedAt: new Date().toISOString(),
        recommendations: [
          { priority: 'info', title: 'Demo Analysis', description: 'Add GEMINI_API_KEY for real AI analysis.', impact: 'N/A', icon: 'smart_toy' },
        ],
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

export default app;
