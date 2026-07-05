# IndianAQI 🌿

A real-time, high-performance citizen science and municipal action platform designed to monitor, report, and mitigate air quality and local pollution hotspots across India. Built on a premium corporate-enterprise design system using a responsive SVG coordinate map, Firebase real-time sync, and Gemini-powered analytical pipelines.

---

## 🚀 Key Features

*   **Interactive Drill-Down SVG Map**:
    *   **National View**: Interactive state-level air quality index (AQI) map of India with custom hover tooltips showing state capitals and live AQI levels.
    *   **State-to-District Drill-down**: Click on any state (e.g. West Bengal, Maharashtra, Karnataka) to smoothly zoom in and transition the map viewport, displaying sub-district outlines (e.g. Kolkata, Howrah, Hooghly) and their localized AQI scores.
    *   **Explorer Sidebar Sync**: Synchronized lists with live search filter functionality matching the zoomed map state.
*   **Gemini AI-Powered Action Insights**:
    *   Uses **Gemini 2.5 Flash** (via Google AI Studio) to parse environmental data, active local hotspots, and peak traffic hours.
    *   Generates prioritized, actionable recommendations (Critical, High, Medium, Info) with estimated quantitative impacts for municipal officers.
*   **Automated CCTV Pollution Spotting**:
    *   Multimodal Python CCTV simulator that periodically scans virtual camera feeds across Indian traffic junctions.
    *   Applies Gemini Vision API to analyze camera frames for illegal waste dumping, construction dust violations, and heavy vehicle smoke, automatically posting high-confidence alerts directly to the backend.
*   **High-Fidelity Evidence Feed**:
    *   A clean, modern gallery showing verified citizen-reported violations, complete with geotagged locations, status tracking (Under Investigation, Resolved, Pending Review), and image overlays.
*   **Open Access Architecture**:
    *   No logins or login barriers required to submit quick reports or RSVP to community cleanup and plantation initiatives.
*   **Enterprise Dashboard Visuals**:
    *   Built using Satoshi typography, sleek dark layouts, concentric highlight grids, glass-morphism panels, and SVG sparkline charts detailing 7-day AQI trends.
    *   Operational toggles (CCTV Streams, MFA, IP Whitelists) and high-density System Operations tables.

---

## 🛠️ Technology Stack

*   **Frontend**: HTML5, Vanilla JavaScript (ES Modules), TailwindCSS (v3), Material Icons.
*   **Backend**: Node.js, Express.
*   **AI Integration**: Google Gen AI SDK (`gemini-2.5-flash`), Gemini Vision API.
*   **Database & Auth**: Firebase JS SDK & Firebase Admin SDK (Cloud Firestore for hotspots, citizen reports, RSVPs, and AI insights).
*   **Multimodal Simulator**: Python (using `requests`, `python-dotenv`, and `google-generativeai`).

---

## 📦 Directory Structure

```text
├── public/                  # Frontend Web Assets
│   ├── national.html        # National Map & Core Landing Hub
│   ├── district.html        # Interactive Drill-down Maps
│   ├── municipality.html    # Command Center & AI Insights Hub
│   ├── js/
│   │   ├── app.js           # Page Initializer & UI Orchestrator
│   │   ├── map.js           # SVG Map Renderer & Zoom Transitions
│   │   ├── india-map-svg.js # SVG Viewbox Path Outlines for States/Districts
│   │   ├── analytics.js     # AI Insights Fetch & SVG Sparkline Trend Charts
│   │   ├── community.js     # Initiative Event Manager & Slot RSVPs
│   │   ├── reports.js       # Citizen Report Submitters & Galleries
│   │   └── config.js        # Global Application Configurations
│   └── css/
│       └── tailwind.css     # Design System & Satoshi Typography Styles
├── server/                  # Node.js Backend Server
│   ├── index.js             # API Router & Express Configuration
│   ├── analytics-cron.js    # AI Recommendations Scheduler
│   └── seed-data.js         # Initial Firebase Seeder
├── simulator/               # CCTV Automated Scanner
│   ├── cctv_simulator.py    # Python Multimodal Simulator Script
│   └── requirements.txt     # Python Dependencies
├── .env                     # Local Environment Config (Git Ignored)
└── README.md                # Repository Documentation
```

---

## ⚙️ Installation & Setup

### 1. Prerequisites
*   Node.js (v18+)
*   Python (v3.9+)
*   A Firebase Project (Firestore enabled)
*   A Gemini API Key (from Google AI Studio)

### 2. Configure Environment variables
Create a `.env` file in the root directory:
```env
# Firebase Web Client Configuration
FIREBASE_API_KEY=your_web_api_key
FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
FIREBASE_PROJECT_ID=your_project_id
FIREBASE_STORAGE_BUCKET=your_project.firebasestorage.app
FIREBASE_MESSAGING_SENDER_ID=your_sender_id
FIREBASE_APP_ID=your_app_id
FIREBASE_MEASUREMENT_ID=your_measurement_id

# Google Gemini API Key
GEMINI_API_KEY=your_gemini_api_key

# Optional: Firebase Admin Service Account (for writing live backend data to Firestore)
FIREBASE_SERVICE_ACCOUNT_PATH=path/to/service-account.json

# Server Config
PORT=3000
NODE_ENV=development
```

### 3. Install Server Dependencies
```bash
npm install
```

### 4. Install Simulator Dependencies
```bash
pip install -r simulator/requirements.txt
```

### 5. Running the Application
*   **Start the Web Server**:
    ```bash
    npm run dev
    # Or run index.js directly
    node server/index.js
    ```
    Access the app at `http://localhost:3000/national.html`.

*   **Generate Recommendations via Analytics Cron**:
    ```bash
    node server/analytics-cron.js
    ```

*   **Run CCTV Multi-Camera Simulator**:
    ```bash
    python simulator/cctv_simulator.py 3
    ```

---

## 🛡️ License

This project is open-source and free for everyone. Built with ❤️ for clean air and a greener India.
