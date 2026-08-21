# 🇮🇳 AeroStreet-AI — Real-Time Pan-India Air Quality & Municipal Intelligence Platform

[![Node.js](https://img.shields.io/badge/Node.js-v20+-68a063?style=for-the-badge&logo=node.js)](https://nodejs.org)
[![Express](https://img.shields.io/badge/Express-4.21-black?style=for-the-badge&logo=express)](https://expressjs.com)
[![TailwindCSS](https://img.shields.io/badge/TailwindCSS-3.4-38bdf8?style=for-the-badge&logo=tailwind-css)](https://tailwindcss.com)
[![IQAir AirVisual](https://img.shields.io/badge/IQAir-AirVisual_API-e11d48?style=for-the-badge)](https://www.iqair.com)
[![Gemini AI](https://img.shields.io/badge/Gemini_AI-2.5_Flash-4285F4?style=for-the-badge&logo=google)](https://ai.google.dev)

> An enterprise-grade environmental monitoring platform featuring **high-precision vector interactive maps for all 36 Indian States & Union Territories**, live multi-source sensor telemetry, 72-hour AI-driven AQI forecasting, and autonomous municipal action planning.

---

## 🌟 Key Highlights & Feature Matrix

```
  ┌────────────────────────────────────────────────────────────────────────┐
  │                           AeroStreet-AI Core Architecture              │
  ├────────────────────────────────────────────────────────────────────────┤
  │                                                                        │
  │  [ 36 Indian States & UTs ] ──► High-Precision Vector SVG Map          │
  │                                       │                                │
  │  [ Live Telemetry Engines ]           ├─► Real-time Dynamic Tinting   │
  │    ├─ IQAir AirVisual API             ├─► Light Hover Glow & Telemetry │
  │    ├─ CPCB Central Sensors            └─► Sub-District Drilldowns      │
  │    └─ WAQI Global Feeds                                                │
  │                                                                        │
  │  [ Municipal Command Center ] ──► CCTV Video Analytics & Alerts        │
  │  [ Predictive AI Engine ]     ──► 72-Hour AQI Forecasting (Gemini 2.5) │
  │                                                                        │
  └────────────────────────────────────────────────────────────────────────┘
```

---

## 📊 Comprehensive Pan-India State AQI Ranking

| Rank | State / Union Territory | Capital | Representative Average AQI | Status | Monitored Level |
| :---: | :--- | :--- | :---: | :---: | :--- |
| **1** | **Delhi (NCT)** | New Delhi | **350** | 🔴 Very Poor | Heavy Particulate Load |
| **2** | **Haryana** | Chandigarh | **290** | 🟠 Poor | Stubble & Industrial |
| **3** | **Uttar Pradesh** | Lucknow | **265** | 🟠 Poor | Vehicular Density |
| **4** | **Punjab** | Chandigarh | **235** | 🟠 Poor | Biomass Combustion |
| **5** | **Bihar** | Patna | **230** | 🟠 Poor | Topographical Stagnation |
| **6** | **Rajasthan** | Jaipur | **200** | 🟠 Poor | Mineral & Road Dust |
| **7** | **West Bengal** | Kolkata | **170** | 🟡 Moderate | Urban Congestion |
| **8** | **Jharkhand** | Ranchi | **160** | 🟡 Moderate | Mining & Thermal |
| **9** | **Madhya Pradesh** | Bhopal | **145** | 🟡 Moderate | Central Transit Corridor |
| **10** | **Gujarat** | Gandhinagar | **135** | 🟡 Moderate | Industrial Belt |
| **11** | **Maharashtra** | Mumbai | **125** | 🟡 Moderate | Coastal Humidity & Traffic |
| **12** | **Chhattisgarh** | Raipur | **120** | 🟡 Moderate | Heavy Manufacturing |
| **13** | **Telangana** | Hyderabad | **105** | 🟡 Moderate | IT Corridors |
| **14** | **Odisha** | Bhubaneswar | **105** | 🟡 Moderate | Coastal Industrial |
| **15** | **Andhra Pradesh** | Amaravati | **95** | 🟢 Satisfactory | Coastal Aeration |
| **16** | **Tamil Nadu** | Chennai | **85** | 🟢 Satisfactory | Maritime Ventilation |
| **17** | **Karnataka** | Bengaluru | **80** | 🟢 Satisfactory | Plateau Air Currents |
| **18** | **Uttarakhand** | Dehradun | **80** | 🟢 Satisfactory | Himalayan Foot-hills |
| **19** | **Jammu & Kashmir** | Srinagar | **72** | 🟢 Satisfactory | Alpine Valleys |
| **20** | **Himachal Pradesh** | Shimla | **65** | 🟢 Satisfactory | Mountain Breeze |
| **21** | **Assam** | Dispur | **65** | 🟢 Satisfactory | Riverine Airflow |
| **22** | **Goa** | Panaji | **55** | 🟢 Satisfactory | Arabian Sea Winds |
| **23** | **Kerala** | Thiruvananthapuram | **50** | 🟢 Good | High Precipitation & Greenery |
| **24** | **Tripura** | Agartala | **48** | 🟢 Good | Dense Forest Cover |
| **25** | **Manipur** | Imphal | **42** | 🟢 Good | Northeast Highlands |
| **26** | **Meghalaya** | Shillong | **40** | 🟢 Good | Clean Rain Belt |
| **27** | **Nagaland** | Kohima | **35** | 🟢 Good | Pristine Forest Air |
| **28** | **Mizoram** | Aizawl | **30** | 🟢 Good | Low Anthropogenic Density |
| **29** | **Sikkim** | Gangtok | **28** | 🟢 Good | 100% Organic State |
| **30** | **Arunachal Pradesh** | Itanagar | **22** | 🟢 Good | Pristine Himalayan Ecosystem |

> **National Average AQI:** `~107 (Moderate)`

---

## 🎨 Interactive Map & Hover Aesthetics

- **Authentic Contours**: 36 States/UTs mapped via ultra-precise SVG vectors (`viewBox: "0 0 612 696"`).
- **Dynamic AQI Coloring**: Every region is tinted proportionally to its AQI severity.
- **Smart Light Hover Glow**: Hovering triggers a luminous, light translucent tint of the state's exact AQI category with `drop-shadow` and stroke expansion.
- **Micro-telemetry Tooltips**: Instant floating cards show state rank, capital, live temperature, humidity, and data source.

---

## 🚀 Quick Start & Installation

```bash
# 1. Clone or navigate to the directory
cd "d:/Pratyush Panda/AQI"

# 2. Install dependencies
npm install

# 3. Configure environment variables in .env
# Includes: IQAIR_API_KEY, GEMINI_API_KEY, FIREBASE_CONFIG

# 4. Start development server
npm run dev
```

Open your browser at **`http://localhost:3000/district.html`** or **`http://localhost:3000/national.html`**.

---

## 📄 Licensing & Credits
- **Data Providers**: CPCB India, IQAir AirVisual, World Air Quality Index (WAQI).
- **AI Acceleration**: Google Gemini 2.5 Flash.
- **Built for**: Clean Air Initiatives & Smart City Governance across India.
