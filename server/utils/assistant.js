// ============================================
// AeroStreet-AI — Urban Air Quality Assistant Engine
// ============================================
// Powers the dedicated Citizen Health & Commute Advisor (Challenge 6)
// Provides structured decision-making tailored to citizen activity & sensitivity.

import { getAQICategory } from './aqi.js';
import { assistantCache } from './cache.js';

/**
 * Generate deterministic rule-based assistant advice.
 * Ensures 100% availability even if Gemini API quota or network fails.
 *
 * @param {object} params - Input context parameters
 * @param {string} params.city - Target urban municipality or city
 * @param {string} [params.ward] - Municipal ward or locality
 * @param {string} params.activity - Planned citizen activity mode
 * @param {string} params.sensitivity - Citizen health vulnerability tier
 * @param {number} params.currentAQI - Real-time or baseline particulate AQI
 * @returns {object} Structured advisory response
 */
export function generateDeterministicAdvice({ city, ward, activity, sensitivity, currentAQI }) {
  const cat = getAQICategory(currentAQI);
  let riskScore = Math.min(100, Math.round((currentAQI / 400) * 100));

  // Sensitivity multiplier
  if (sensitivity === 'respiratory_asthma') riskScore = Math.min(100, riskScore + 20);
  else if (sensitivity === 'children' || sensitivity === 'elderly')
    riskScore = Math.min(100, riskScore + 12);

  // Determine risk tier
  let riskTier = 'Low';
  if (riskScore > 80) riskTier = 'Critical';
  else if (riskScore > 60) riskTier = 'High';
  else if (riskScore > 40) riskTier = 'Elevated';
  else if (riskScore > 20) riskTier = 'Moderate';

  // Activity-specific guidance
  let activityAdvice = '';
  let safeWindow = '';
  let commuteTip = '';

  switch (activity) {
    case 'outdoor_exercise':
      if (currentAQI > 200) {
        activityAdvice =
          'Suspension recommended. Outdoor aerobic cardio will cause deep alveolar particulate penetration.';
        safeWindow = 'Switch to indoor home workouts or gym with HEPA filtration.';
      } else if (currentAQI > 100) {
        activityAdvice =
          'Moderate your intensity. Replace strenuous running with low-impact brisk walking.';
        safeWindow =
          'Optimal window: 12:00 PM – 3:30 PM (after solar thermal inversion layer dissipates).';
      } else {
        activityAdvice = 'Favorable conditions for morning/evening cycling, jogging, and sports.';
        safeWindow = 'Safe throughout the daytime; monitor evening rush-hour changes.';
      }
      break;

    case 'commute':
      if (currentAQI > 250) {
        commuteTip =
          'Keep car windows strictly sealed with AC on internal recirculation. Avoid two-wheelers/open auto-rickshaws if possible.';
      } else {
        commuteTip =
          'Standard transit precautions. Plan routes away from heavy freight bypasses where diesel soot peaks.';
      }
      activityAdvice = `Commuting in ${ward || city}: Prioritize metro or closed public transit. Diesel exhaust peaks along arterial corridors between 8:30–10:30 AM and 5:30–8:30 PM.`;
      safeWindow =
        'Depart before 8:00 AM or after 10:30 AM to bypass the densest particulate stagnation.';
      break;

    case 'school_elderly_care':
      activityAdvice = `Heightened protection needed for vulnerable groups in ${ward || city}. Children and seniors absorb up to 3x more particulates relative to body weight.`;
      safeWindow =
        currentAQI > 200
          ? 'Keep indoor play only. Schedule outdoor recess only if AQI drops below 150.'
          : 'Outdoor activities permissible during midday (11:30 AM – 3:00 PM).';
      commuteTip =
        'Ensure school buses keep windows shut during morning industrial/traffic corridors.';
      break;

    default:
      activityAdvice = `General urban activity advice for ${city}: AQI is currently ${currentAQI} (${cat.category}).`;
      safeWindow = 'Best air circulation typically occurs between 12:00 PM and 4:00 PM.';
      commuteTip = 'Monitor local ward hotspots before venturing out for prolonged periods.';
      break;
  }

  // N95 / Protection recommendation
  let protection = 'No specialized respirator needed under current conditions.';
  if (currentAQI > 300) {
    protection =
      'Mandatory N95 / FFP2 certified respirator outdoors. Cloth and surgical masks provide zero protection against PM2.5.';
  } else if (currentAQI > 150) {
    protection =
      'Recommended N95 respirator for commutes > 15 minutes, especially for sensitive groups.';
  }

  return {
    success: true,
    source: 'deterministic_engine',
    city,
    ward,
    currentAQI,
    category: cat.category,
    grapStage: cat.grapStage,
    riskScore,
    riskTier,
    safeWindow,
    protection,
    commuteTip,
    activityAdvice,
    summary: `In ${city} (${ward}), air quality is ${cat.category} (AQI ${currentAQI}). Risk index is ${riskTier} (${riskScore}/100) for ${sensitivity.replace('_', ' ')}. ${cat.advisory}`,
    generatedAt: new Date().toISOString(),
  };
}

/**
 * Run context-aware Urban Air Quality Assistant query.
 * Uses Gemini 2.5 Flash if API key is present, otherwise falls back gracefully to deterministic engine.
 *
 * @param {object} params - Input parameters
 * @param {string} params.city - Target urban municipality or city
 * @param {string} [params.ward] - Municipal ward or locality
 * @param {string} params.activity - Planned citizen activity mode
 * @param {string} params.sensitivity - Citizen health vulnerability tier
 * @param {number} params.currentAQI - Real-time or baseline particulate AQI
 * @returns {Promise<object>} Structured AI / deterministic advisory response
 */
export async function queryUrbanAssistant(params) {
  const { city, ward, activity, sensitivity, currentAQI } = params;
  const cacheKey = `assistant_${city}_${ward}_${activity}_${sensitivity}_${Math.round(currentAQI / 10)}`;

  const cached = assistantCache.get(cacheKey);
  if (cached) {
    return { ...cached, source: 'cache' };
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    const fallback = generateDeterministicAdvice(params);
    assistantCache.set(cacheKey, fallback);
    return fallback;
  }

  try {
    const { GoogleGenerativeAI } = await import('@google/generative-ai');
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

    const prompt = `You are the AeroStreet-AI Urban Air Quality Assistant for Indian cities.
A citizen has requested context-aware health and commute advice.

Context:
- Location: ${city}, Ward: ${ward}
- Current AQI: ${currentAQI}
- Planned Activity: ${activity} (e.g. commute, outdoor_exercise, school_elderly_care, general)
- Sensitivity Group: ${sensitivity} (e.g. general, children, elderly, respiratory_asthma)

Provide reasoned, hyper-actionable advice formatted in strict JSON matching this schema:
{
  "riskScore": integer (0 to 100),
  "riskTier": "Low" | "Moderate" | "Elevated" | "High" | "Critical",
  "safeWindow": "string describing the safest time window today",
  "protection": "string describing mask/purifier guidelines",
  "commuteTip": "string with specific route/transit advice",
  "activityAdvice": "string with specific activity modification guidelines",
  "summary": "2-3 concise sentences summarizing recommendations"
}

Output ONLY the JSON object. Do not wrap in markdown or backticks.`;

    const result = await model.generateContent(prompt);
    let text = result.response.text().trim();
    text = text
      .replace(/^```json\s*/i, '')
      .replace(/```\s*$/, '')
      .trim();

    const parsed = JSON.parse(text);
    const cat = getAQICategory(currentAQI);

    const payload = {
      success: true,
      source: 'gemini_ai',
      city,
      ward,
      currentAQI,
      category: cat.category,
      grapStage: cat.grapStage,
      ...parsed,
      generatedAt: new Date().toISOString(),
    };

    assistantCache.set(cacheKey, payload);
    return payload;
  } catch (err) {
    console.warn('[Assistant AI Error, falling back to deterministic]:', err.message);
    const fallback = generateDeterministicAdvice(params);
    assistantCache.set(cacheKey, fallback);
    return fallback;
  }
}
