// ============================================
// AeroStreet AI — Analytics Cron Job
// ============================================
// Track 2: Periodically fetches AQI data, aggregates
// hotspot info, and uses Gemini to generate
// municipality recommendations.

import 'dotenv/config';

const DISTRICTS = [
  { id: 'delhi', name: 'Delhi NCT', avgAQI: 345, hotspotCount: 12, peakHours: ['8:00-10:00', '17:00-20:00'] },
  { id: 'mumbai', name: 'Mumbai', avgAQI: 142, hotspotCount: 5, peakHours: ['7:30-9:30', '18:00-20:30'] },
  { id: 'bangalore', name: 'Bangalore', avgAQI: 55, hotspotCount: 2, peakHours: ['8:30-10:00', '17:30-19:30'] },
  { id: 'kolkata', name: 'Kolkata', avgAQI: 178, hotspotCount: 7, peakHours: ['8:00-10:30', '17:00-19:00'] },
  { id: 'pune', name: 'Pune', avgAQI: 112, hotspotCount: 4, peakHours: ['8:00-9:30', '17:30-19:30'] },
];

/**
 * Generate AI recommendations for a district using Gemini
 */
async function generateRecommendations(district) {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    console.log(`  ⚠ No GEMINI_API_KEY — generating mock recommendations for ${district.name}`);
    return {
      districtId: district.id,
      districtName: district.name,
      generatedAt: new Date().toISOString(),
      dataContext: {
        hotspotCount: district.hotspotCount,
        avgAQI: district.avgAQI,
        peakHours: district.peakHours,
      },
      recommendations: [
        {
          priority: district.avgAQI > 300 ? 'critical' : district.avgAQI > 150 ? 'high' : 'medium',
          title: `Traffic management advisory for ${district.name}`,
          description: `Based on ${district.hotspotCount} active hotspots and average AQI of ${district.avgAQI}, recommend traffic diversions during peak hours ${district.peakHours.join(', ')}.`,
          impact: `Estimated ${Math.round(district.avgAQI * 0.05)}% AQI improvement`,
          icon: 'traffic',
        },
        {
          priority: 'medium',
          title: `Dust suppression deployment`,
          description: `Deploy water sprinkler units along major construction corridors in ${district.name} during dry hours.`,
          impact: 'Estimated 10-15% PM10 reduction',
          icon: 'water_drop',
        },
      ],
    };
  }

  try {
    const { GoogleGenerativeAI } = await import('@google/generative-ai');
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

    const prompt = `You are an expert urban environmental analyst for Indian municipalities.

Analyze pollution data for ${district.name}:
- Current Average AQI: ${district.avgAQI}
- Active Hotspots: ${district.hotspotCount}
- Traffic Peak Hours: ${district.peakHours.join(', ')}
- Data sources: Ground sensors, CCTV cameras, citizen reports

Generate 3-5 specific, actionable recommendations for the municipality to reduce pollution.
Each recommendation must include:
1. Priority level: "critical", "high", "medium", or "info"
2. Short title (max 10 words)
3. Detailed description (2-3 sentences with specific locations/times)
4. Expected quantitative impact
5. A relevant Google Material Symbols icon name

IMPORTANT: Format your response as a valid JSON array only. No markdown, no explanation outside the JSON.
Example format:
[{"priority":"high","title":"Title","description":"Description","impact":"Impact","icon":"icon_name"}]`;

    console.log(`  🤖 Calling Gemini for ${district.name}...`);
    const result = await model.generateContent(prompt);
    const text = result.response.text();

    let recommendations;
    try {
      const jsonMatch = text.match(/\[[\s\S]*?\]/);
      recommendations = jsonMatch ? JSON.parse(jsonMatch[0]) : [];
    } catch {
      console.warn(`  ⚠ Failed to parse Gemini JSON for ${district.name}, using raw text`);
      recommendations = [{
        priority: 'info',
        title: 'AI Analysis Summary',
        description: text.slice(0, 300),
        impact: 'See full analysis',
        icon: 'smart_toy',
      }];
    }

    return {
      districtId: district.id,
      districtName: district.name,
      generatedAt: new Date().toISOString(),
      dataContext: {
        hotspotCount: district.hotspotCount,
        avgAQI: district.avgAQI,
        peakHours: district.peakHours,
      },
      recommendations,
    };
  } catch (err) {
    console.error(`  ✗ Gemini error for ${district.name}:`, err.message);
    return null;
  }
}

/**
 * Store recommendations in Firestore (if available)
 */
async function storeInFirestore(data) {
  if (!process.env.FIREBASE_SERVICE_ACCOUNT_PATH) {
    console.log(`  📦 Would store in Firestore: ${data.districtId} (${data.recommendations.length} recommendations)`);
    return null;
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
    const docRef = await db.collection('ai_recommendations').add(data);
    console.log(`  ✓ Stored in Firestore: ${docRef.id}`);
    return docRef.id;
  } catch (err) {
    console.error(`  ✗ Firestore error:`, err.message);
    return null;
  }
}

/**
 * Main cron execution
 */
async function runAnalyticsCron() {
  console.log('\n╔══════════════════════════════════════════════╗');
  console.log('║   🌿 AeroStreet AI — Analytics Cron Job      ║');
  console.log('║   Generating AI recommendations...           ║');
  console.log('╚══════════════════════════════════════════════╝\n');

  const startTime = Date.now();

  for (const district of DISTRICTS) {
    console.log(`\n📍 Processing: ${district.name} (AQI: ${district.avgAQI})`);

    const data = await generateRecommendations(district);
    if (data) {
      await storeInFirestore(data);
      console.log(`  ✓ Generated ${data.recommendations.length} recommendations`);
      data.recommendations.forEach((r, i) => {
        console.log(`    ${i + 1}. [${r.priority.toUpperCase()}] ${r.title}`);
      });
    }
  }

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`\n✅ Analytics cron completed in ${elapsed}s`);
  console.log(`   Processed ${DISTRICTS.length} districts\n`);
}

// ── Execute ──
runAnalyticsCron().catch(err => {
  console.error('Cron job failed:', err);
  process.exit(1);
});
