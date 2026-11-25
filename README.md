# 🇮🇳 AeroStreet-AI — Urban Air Quality Assistant & Municipal Intelligence Platform

[![Node.js](https://img.shields.io/badge/Node.js-v20+-68a063?style=for-the-badge&logo=node.js)](https://nodejs.org)
[![Express](https://img.shields.io/badge/Express-4.21-black?style=for-the-badge&logo=express)](https://expressjs.com)
[![TailwindCSS](https://img.shields.io/badge/TailwindCSS-3.4-38bdf8?style=for-the-badge&logo=tailwind-css)](https://tailwindcss.com)
[![Gemini AI](https://img.shields.io/badge/Gemini_AI-2.5_Flash-4285F4?style=for-the-badge&logo=google)](https://ai.google.dev)
[![Vercel Deployment](https://img.shields.io/badge/Vercel-Live_Production-000000?style=for-the-badge&logo=vercel)](https://aerostreetai.vercel.app)
[![WCAG 2.1 AA](https://img.shields.io/badge/Accessibility-WCAG_2.1_AA-success?style=for-the-badge)](https://www.w3.org/WAI/standards-guidelines/wcag/)
[![CI Status](https://img.shields.io/badge/Build-Passing_(14%2F14_Tests)-brightgreen?style=for-the-badge)](https://github.com)

> **Live Production Deployment:** [https://aerostreetai.vercel.app](https://aerostreetai.vercel.app)  
> Built for the **Hack2skill PromptWars Challenge 6**.

---

## Chosen Vertical

**[Challenge 6] Urban Air Quality Assistant**

AeroStreet-AI addresses India's urban air pollution crisis by delivering a context-aware **Urban Air Quality Assistant** and civic intelligence platform. Rather than displaying passive, raw particulate numbers that confuse citizens, AeroStreet-AI translates complex environmental telemetry (CPCB, IQAir, OpenAQ, and WAQI) into actionable, personalized decisions: optimal commute routes, safe outdoor exercise windows, vulnerability-specific health advisories, and automated municipal Graded Response Action Plan (GRAP) interventions.

---

## Approach and Logic

```
   ┌────────────────────────────────────────────────────────────────────────┐
   │                    AeroStreet-AI System Data Flow                      │
   ├────────────────────────────────────────────────────────────────────────┤
   │                                                                        │
   │  [ Ground Telemetry ] ──► CPCB + IQAir + OpenAQ + WAQI                 │
   │                                   │                                    │
   │  [ In-Memory TTL Cache ] ─────────┼─► 10-Min Cache (LRU-Evicted)       │
   │                                   │                                    │
   │  [ Validation & Sanitization ] ───┼─► Clamp Ranges, Sanitize Inputs    │
   │                                   │                                    │
   │  [ Context Engine ] ──────────────┼─► Activity + Sensitivity + Ward    │
   │                                   │                                    │
   │  [ Gemini 2.5 Flash Engine ] ─────┼─► Thermal Inversion + Advisories   │
   │  (Deterministic Fallback)         │                                    │
   │                                   ▼                                    │
   │  [ Output Interfaces ] ───────────┴─► Urban Assistant Modal (TTS Audio)│
   │                                   ├─► 7-Day Diurnal Predictive Curves  │
   │                                   ├─► 36 State/UT High-Precision Map   │
   │                                   └─► Municipal Enforcement Console    │
   │                                                                        │
   └────────────────────────────────────────────────────────────────────────┘
```

1. **Multi-Source Telemetry Fusion & Normalization:**
   - Ingests ground telemetry from Central Pollution Control Board (CPCB) continuous ambient air quality monitoring stations (CAAQMS), IQAir AirVisual, OpenAQ, and WAQI.
   - Normalizes disparate schemas into a unified telemetry payload with station metadata, geographic coordinates, particulate concentrations ($PM_{2.5}$, $PM_{10}$, $NO_2$, $SO_2$, $CO$, $O_3$), and station health timestamps.
   - Built with concurrent, non-blocking `Promise.allSettled` lookups with `AbortSignal.timeout(4000)` so one lagging upstream provider never blocks response delivery.

2. **Official CPCB Piecewise Linear Sub-Index Calculations:**
   - Implements the Indian National Air Quality Index (NAQI) mathematical sub-index formula:
     $$I_p = \frac{I_{HI} - I_{LO}}{B_{HI} - B_{LO}} \cdot (C_p - B_{LO}) + I_{LO}$$
   - Maps values strictly across the 6 official CPCB severity categories:
     - **Good** (0–50)
     - **Satisfactory** (51–100)
     - **Moderate** (101–200)
     - **Poor** (201–300)
     - **Very Poor** (301–400)
     - **Severe** (401–500)
   - Automatically maps severe values into Delhi-NCR Graded Response Action Plan (GRAP) regulatory stages (Stage I through Stage IV).

3. **High-Resilience In-Memory TTL Caching (`TTLMemoryCache`):**
   - Telemetry responses are cached with a 10-minute TTL; Gemini reasoning outputs are cached with a 5-minute parameter-hash TTL.
   - Implements maximum-entry eviction to prevent memory bloat in long-running processes.
   - Serves cached and deterministic baseline telemetry when upstream API keys are absent, exhausted, or facing third-party network outages.

4. **Sliding-Window Rate Limiting & Input Sanitization:**
   - Protects serverless and Node.js endpoints with an in-memory sliding-window limiter (60 req/min for general API, 15 req/min for compute-intensive Gemini endpoints).
   - Strict payload size bounds (`express.json({ limit: '100kb' })`) and string sanitization preventing cross-site scripting (XSS), script injection, and query parameter pollution.

5. **Context-Aware Gemini 2.5 Flash Reasoning Pipeline:**
   - Synthesizes user profile inputs (City/Ward, Intended Activity: Commute vs. Outdoor Exercise vs. School, Sensitivity: General vs. Children vs. Elderly vs. Asthmatic) with live atmospheric parameters (temperature, wind speed, boundary layer stagnation).
   - Delivers structured JSON recommendations + natural-language guidance with deterministic rule-based fallbacks ensuring zero user downtime.

---

## How the Solution Works

### 1. Interactive Pan-India 36 State & UT Vector Explorer
- **Precision Contours:** Authentically mapped SVG coordinates covering all 36 Indian States and Union Territories (`viewBox: "0 0 612 696"`).
- **Dynamic Color Tinting:** Real-time CPCB category fill colors with smooth CSS transitions.
- **Full WCAG Keyboard & Screen Reader Support:** Every state and district path is focusable (`tabindex="0"`, `role="button"`), announces its name and current AQI via `aria-label`, and triggers drill-downs on `Enter` or `Space`.

### 2. Context-Aware Urban Air Quality Assistant (Challenge 6)
- **Floating Action Launcher:** Accessible from every platform page via a persistent, floating launcher button.
- **Location Detection:** Auto-detects coordinates via browser geolocation or instant city chips (Delhi NCR, Mumbai, Bengaluru, Kolkata, Chennai, Lucknow).
- **Activity & Vulnerability Tuning:** Adapts guidance specifically for:
  - Daily urban commuters (transit mode comparisons: Metro vs. AC Bus vs. Two-Wheeler).
  - Outdoor runners and joggers (identifies diurnal safe windows when boundary layers rise).
  - High-risk populations (children, seniors, asthmatic citizens).
- **Accessible TTS Audio Readout:** Built-in Web Speech API audio narration allows visually impaired or busy citizens to listen to their morning air quality brief.

### 3. Diurnal 7-Day Predictive AQI Simulator (`Forecast.tsx` & `/forecast.html`)
- **Environmental Variable Sliders:** Calibrate traffic density (0–100%), industrial emissions (0–100%), wind speed (0–50 km/h), and temperature (-10°C to 50°C).
- **Dynamic SVG Forecast Curves:** Vector paths update instantly on slider input without full-page reloads.
- **Gemini 2.5 Policy Engine:** Click **"Refine with Gemini AI"** to analyze thermal inversion risks, particulate accumulation rates, and municipal mitigation actions.

### 4. Municipality Command Hub & Citizen Violation Enforcement
- **Automated Incident Logging:** Real-time ingest of citizen reports and simulated CCTV surveillance alerts.
- **Automated Legal Notice Generator (`POST /api/generate-legal-notice`):** Instantly drafts formal Cease & Desist notices citing the Air (Prevention and Control of Pollution) Act, 1981 and Environment (Protection) Act, 1986.
- **Secure Violation Photo Uploads:** Multored file uploads capped at 5 MB with strict MIME validation (JPEG, PNG, WebP only) and Vercel-safe in-memory processing.

---

## Assumptions Made

1. **CPCB Breakpoints as Ground Truth:** Official Central Pollution Control Board (CPCB) PM2.5 and PM10 sub-index breakpoint tables serve as the definitive standard for Indian air quality classification over international EPA standards.
2. **Deterministic Baseline Fallback:** If third-party APIs (OpenAQ, IQAir, Gemini) encounter rate limits, network outages, or unconfigured environment keys, the application seamlessly switches to verified regional baseline telemetry rather than failing or showing empty states.
3. **Diurnal Dispersion Physics:** The simulation model assumes vehicular emissions peak during morning (08:00–10:00) and evening (18:00–21:00) rush hours, while thermal inversions trap particulates during low-wind, low-temperature night hours.
4. **Stateless Serverless Execution:** The application architecture assumes a stateless environment (`api/index.js` on Vercel Serverless Functions) with no permanent local disk dependencies; all caching is designed with lightweight in-memory storage.
5. **Upload Safeguards:** Citizen incident uploads are assumed to be user-submitted photos; strict 5 MB file bounds, in-memory buffers, and MIME-type checks protect against storage exhaustion and arbitrary file upload exploits.

---

## 🔒 Security Architecture

AeroStreet-AI enforces security-by-design principles documented in [`SECURITY.md`](SECURITY.md):
- **OWASP HTTP Security Headers:** Custom middleware enforcing:
  - `X-Content-Type-Options: nosniff`
  - `X-Frame-Options: DENY`
  - `Referrer-Policy: strict-origin-when-cross-origin`
  - `Permissions-Policy: camera=(), microphone=(), geolocation=(self)`
  - `Content-Security-Policy: default-src 'self' ...` (allowing Tailwind CDN, Fontshare, Unsplash images, and Firebase while blocking unauthorized third-party scripts).
- **CORS Allowlist:** Origin-restricted to production domain (`https://aerostreetai.vercel.app`), local development (`http://localhost:3000`), and `ALLOWED_ORIGINS` environment variables (no wildcard `*` in production).
- **Zero Client Secret Leaks:** Client configuration endpoints explicitly strip sensitive API keys (`GEMINI_API_KEY`, `IQAIR_API_KEY`). All AI and external API calls are executed strictly backend-to-backend.
- **Hardened Ingestion:** In-memory sliding-window rate limiters prevent DDoS and scraping attacks.

---

## ♿ WCAG 2.1 AA Accessibility Compliance

The entire interface meets **WCAG 2.1 Level AA** standards:
- **Skip Navigation:** Every page begins with a keyboard-accessible skip link (`#main-content`).
- **Semantic Structure:** Semantic landmarks (`<nav aria-label="...">`, `<main id="main-content" role="main">`, `<footer>`) and logical heading hierarchies (`<h1>` $\rightarrow$ `<h2>` $\rightarrow$ `<h3>`).
- **Accessible Interactive Maps:** Pan-India state and district SVG vector paths include `role="button"`, `tabindex="0"`, dynamic `aria-label`, and keyboard activation handlers (`Enter` and `Space`).
- **Accessible Forms & Sliders:** Sliders and inputs feature explicit `<label for="...">`, `aria-valuemin`, `aria-valuemax`, and `aria-valuenow`.
- **Live Regions (`aria-live="polite"`):** Live AQI readouts, Gemini AI advisory updates, and assistant calculation panels announce changes automatically to assistive technologies.
- **High-Contrast Text:** Text and UI badges adhere to the $\ge 4.5:1$ contrast ratio requirement.

---

## 🧪 Automated Testing & Continuous Integration

AeroStreet-AI includes a comprehensive, dependency-free test suite using Node's native test runner (`node:test` and `node:assert/strict`), keeping repository size strictly under 10 MB.

### Test Suites (`tests/`):
1. **`tests/aqi-utils.test.js`:** Unit tests for CPCB PM2.5 piecewise linear sub-indices, category classification, GRAP stage mappings, and multi-provider telemetry normalization.
2. **`tests/api.test.js`:** Integration tests for `/api/health`, `/api/live-aqi`, `/api/gemini-forecast-insights`, `/api/assistant`, `/api/generate-legal-notice`, security headers, Cache-Control verification, and HTTP 400 rejection on invalid inputs.
3. **`tests/security-accessibility.test.js`:** Automated static analysis asserting all 8 HTML templates have `lang="en"`, skip links, semantic `<main>`, accessible image alt tags, and zero leaked production secrets.

### Running Tests Locally:

```bash
# Run syntax checks across all JavaScript files
npm run lint

# Run all 14 automated unit, integration, and security tests
npm test
```

### GitHub Actions CI (`.github/workflows/ci.yml`):
Every push and pull request to `main` runs automated linting and test execution on Node.js 20.

---

## 🚀 Quick Start & Installation

```bash
# 1. Clone the repository
git clone https://github.com/Saswat-643/AeroStreet-AI.git
cd AeroStreet-AI

# 2. Install dependencies (lightweight, zero bloat)
npm install

# 3. Create .env from template (optional: defaults to resilient fallback mode)
cp .env.example .env

# 4. Run tests
npm test

# 5. Start development server
npm run dev
```

Visit `http://localhost:3000` or `http://localhost:3000/national.html`.

---

## 📁 Repository Structure

```
AeroStreet-AI/
├── .github/workflows/ci.yml    # Automated GitHub Actions CI pipeline
├── api/
│   └── index.js                # Vercel serverless entry point
├── components/                 # React UI components (About, Footer, FAQ, Municipality)
├── public/
│   ├── css/                    # Stylesheets
│   └── js/
│       ├── analytics.js        # Historical charts & trend renderers
│       ├── app.js              # Main application orchestrator
│       ├── assistant-widget.js # Challenge 6 Urban Air Quality Assistant widget
│       ├── auth.js             # Authentication & session management
│       ├── config.js           # Frontend configuration & AQI scales
│       ├── map.js              # Accessible 36-State/UT interactive SVG map
│       └── reports.js          # Citizen violation reporting & modal logic
├── scripts/
│   └── lint.js                 # Cross-platform node --check syntax linter
├── server/
│   ├── index.js                # Express production server & API routing
│   ├── middleware/
│   │   ├── security.js         # OWASP headers, CORS allowlist, rate limiting
│   │   └── validate.js         # Input sanitization & range clamping
│   └── utils/
│       ├── aqi.js              # CPCB sub-index formulas & normalization
│       ├── assistant.js        # Gemini 2.5 Flash context reasoning engine
│       └── cache.js            # In-memory TTL cache with LRU eviction
├── templates/                  # Production HTML pages (national, district, forecast, etc.)
├── tests/                      # Automated test suite (node:test)
├── App.tsx                     # React root application
├── Forecast.tsx                # Diurnal 7-day predictive simulator component
├── Municipality.tsx            # Municipal operations hub component
├── SECURITY.md                 # Security architecture & disclosure policy
├── package.json                # Scripts & lightweight dependencies
└── vercel.json                 # Vercel deployment routing configuration
```

---

## ⚖️ License & Attribution

Built for the **Hack2skill PromptWars Challenge 6 ("Urban Air Quality Assistant")**.  
Released under the MIT License. Data feeds calibrated against official CPCB guidelines and OpenAQ open environmental telemetry.
