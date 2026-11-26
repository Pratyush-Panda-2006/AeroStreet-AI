// ============================================
// AeroStreet-AI — Strict Request Validation Middleware
// ============================================

/**
 * Sanitize strings against HTML/script injection
 * @param {string} str
 * @returns {string}
 */
export function sanitizeString(str) {
  if (typeof str !== 'string') return '';
  return str
    .replace(/[<>]/g, '') // Strip angle brackets
    .trim()
    .slice(0, 500); // Enforce max string length
}

/**
 * Validate and sanitize forecast simulation inputs.
 *
 * @param {import('express').Request} req - Express request
 * @param {import('express').Response} res - Express response
 * @param {import('express').NextFunction} next - Express next middleware
 * @returns {void|import('express').Response}
 */
export function validateForecastInputs(req, res, next) {
  const { traffic, industry, wind, temp, baseline } = req.body;

  // Check required
  if (traffic === undefined || industry === undefined || wind === undefined || temp === undefined) {
    return res.status(400).json({
      success: false,
      error: 'Missing required numeric parameters: traffic, industry, wind, temp',
    });
  }

  const numTraffic = Number(traffic);
  const numIndustry = Number(industry);
  const numWind = Number(wind);
  const numTemp = Number(temp);
  const numBaseline = baseline !== undefined ? Number(baseline) : 150;

  if (
    isNaN(numTraffic) ||
    isNaN(numIndustry) ||
    isNaN(numWind) ||
    isNaN(numTemp) ||
    isNaN(numBaseline)
  ) {
    return res.status(400).json({
      success: false,
      error: 'Invalid parameter types. Parameters must be valid numeric values.',
    });
  }

  // Clamping ranges
  req.sanitized = {
    traffic: Math.max(0, Math.min(100, Math.round(numTraffic))),
    industry: Math.max(0, Math.min(100, Math.round(numIndustry))),
    wind: Math.max(0, Math.min(150, Math.round(numWind * 10) / 10)),
    temp: Math.max(-20, Math.min(60, Math.round(numTemp * 10) / 10)),
    baseline: Math.max(10, Math.min(500, Math.round(numBaseline))),
  };

  next();
}

/**
 * Validate geographic coordinates query or body parameters.
 *
 * @param {import('express').Request} req - Express request
 * @param {import('express').Response} res - Express response
 * @param {import('express').NextFunction} next - Express next middleware
 * @returns {void|import('express').Response}
 */
export function validateCoordinates(req, res, next) {
  const lat = req.query.lat || req.body.lat || req.body.coordinates?.lat;
  const lng = req.query.lng || req.query.lon || req.body.lng || req.body.coordinates?.lng;

  if (lat === undefined || lng === undefined) {
    return res.status(400).json({
      success: false,
      error: 'Missing latitude or longitude coordinates',
    });
  }

  const numLat = Number(lat);
  const numLng = Number(lng);

  if (
    isNaN(numLat) ||
    isNaN(numLng) ||
    numLat < -90 ||
    numLat > 90 ||
    numLng < -180 ||
    numLng > 180
  ) {
    return res.status(400).json({
      success: false,
      error: 'Invalid coordinates. Latitude must be -90 to 90, longitude -180 to 180.',
    });
  }

  req.sanitizedCoords = {
    lat: Math.round(numLat * 10000) / 10000,
    lng: Math.round(numLng * 10000) / 10000,
  };

  next();
}

/**
 * Validate Urban Air Quality Assistant request payload.
 *
 * @param {import('express').Request} req - Express request
 * @param {import('express').Response} res - Express response
 * @param {import('express').NextFunction} next - Express next middleware
 * @returns {void|import('express').Response}
 */
export function validateAssistantRequest(req, res, next) {
  const { city, ward, activity, sensitivity, currentAQI } = req.body;

  const validActivities = ['commute', 'outdoor_exercise', 'school_elderly_care', 'general'];
  const validSensitivities = ['general', 'children', 'elderly', 'respiratory_asthma'];

  const sanitizedCity = sanitizeString(city || 'Delhi');
  const sanitizedWard = sanitizeString(ward || 'Central');
  const checkedActivity = validActivities.includes(activity) ? activity : 'general';
  const checkedSensitivity = validSensitivities.includes(sensitivity) ? sensitivity : 'general';
  const sanitizedAQI =
    currentAQI !== undefined ? Math.max(0, Math.min(500, Number(currentAQI) || 150)) : 150;

  req.sanitizedAssistant = {
    city: sanitizedCity || 'Delhi',
    ward: sanitizedWard,
    activity: checkedActivity,
    sensitivity: checkedSensitivity,
    currentAQI: sanitizedAQI,
  };

  next();
}
