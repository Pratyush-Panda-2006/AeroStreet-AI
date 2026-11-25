# Security Policy & Architecture

## Security Architecture

AeroStreet-AI is engineered for urban environmental monitoring with an enterprise defense-in-depth security posture designed for public-facing deployments.

### 1. API Key Isolation & Server-Side Proxies
- **Zero Client Leakage**: All generative AI calls (Google Gemini 2.5 Flash), CCTV webhooks, and OpenAQ telemetry queries are strictly isolated on the Express backend (`/api/*`).
- **No Secret Injection**: Client-side scripts only receive safe public configurations (e.g. Firebase public web keys, map styling endpoints). `GEMINI_API_KEY` and service account private keys are never exposed in DOM attributes or `window.__AEROSTREET_CONFIG__`.

### 2. Comprehensive Security Headers
Every HTTP response is guarded by standard security headers:
- `X-Content-Type-Options: nosniff` — Prevents MIME-confusion attacks.
- `X-Frame-Options: DENY` — Defends against clickjacking.
- `Referrer-Policy: strict-origin-when-cross-origin` — Protects path disclosure.
- `Permissions-Policy: camera=(), microphone=(), geolocation=(self)` — Restricts browser hardware access.
- `Content-Security-Policy` — Authorizes only verified asset CDNs (Tailwind CSS, Fontshare, Google Fonts, Chart.js, OpenStreetMap Nominatim, Supabase REST).

### 3. Rate Limiting & DoS Protection
- **General API Tier**: In-memory sliding-window limiter enforcing a maximum of **60 requests per minute** per client IP on `/api/*` endpoints.
- **AI Intelligence Tier**: Sensitive Gemini forecasting, legal notice, and assistant endpoints (`/api/assistant`, `/api/gemini-forecast-insights`, `/api/generate-legal-notice`, `/api/gemini-analyze`) are capped at **15 requests per minute** per client IP, returning standard HTTP `429 Too Many Requests` with a `Retry-After` header.

### 4. Strict Input Validation & Sanitization
- Body payload size is bounded at `100kb` (`express.json({ limit: '100kb' })`) to prevent heap exhaustion.
- All query parameters, simulation slider values, activity selections, and location strings are strictly validated and clamped to physiological/physical ranges (`traffic`, `industry` in `0–100%`, `wind` in `0–150 km/h`, `temp` in `-20–60°C`, coordinates clamped to valid geospatial ranges).
- Strings are stripped of HTML tags and control characters to prevent cross-site scripting (XSS).

### 5. Hardened Media Uploads
- Citizen photo submissions via `/api/reports` are processed using an in-memory buffer (`multer.memoryStorage()`) ensuring stateless compatibility with serverless environments (e.g., Vercel).
- Files are limited to **5 MB maximum size**.
- Strict MIME-type filtering permits only verified image formats: `image/jpeg`, `image/png`, and `image/webp`.

### 6. Graceful Offline Fallbacks
If upstream APIs throttle or network connectivity degrades, deterministic algorithms ensure uninterrupted uptime without disclosing internal error traces or stack dumps to clients.

---

## Reporting a Vulnerability

If you discover a potential security vulnerability in AeroStreet-AI, please report it responsibly by contacting the maintainers directly via GitHub issues or email. We commit to reviewing reports within 24 hours and releasing a fix promptly.
