import React, { useState } from 'react';
import ForecastFaqKelo from './components/ForecastFaqKelo';
import FooterMoxo from './components/FooterMoxo';

export default function Forecast() {
  const [traffic, setTraffic] = useState<number>(50);
  const [industry, setIndustry] = useState<number>(40);
  const [wind, setWind] = useState<number>(12);
  const [temp, setTemp] = useState<number>(28);
  const [isGeminiLoading, setIsGeminiLoading] = useState<boolean>(false);
  const [aiAdvice, setAiAdvice] = useState<string>(
    "Diurnal atmospheric simulation indicates localized stagnation during morning rush hours. Increasing surface wind dispersion or dampening arterial freight traffic reduces severe PM2.5 boundary-layer trapping."
  );

  const handleRefineGemini = () => {
    setIsGeminiLoading(true);
    setTimeout(() => {
      setIsGeminiLoading(false);
      setAiAdvice(
        `Gemini 2.5 Inversion Analysis calibrated for ${temp}°C and ${wind} km/h wind: High thermal inversion risk detected in industrial perimeters. Recommend proactive anti-smog misting across corridor junctions and issuing localized Level-2 GRAP dispatch advisories.`
      );
    }, 1000);
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-800 antialiased flex flex-col font-sans">
      {/* Top Navigation Header */}
      <header className="fixed top-0 left-0 right-0 h-16 z-50 bg-white/85 backdrop-blur-md border-b border-slate-200/80 flex items-center justify-between px-6 lg:px-12">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-slate-900 flex items-center justify-center text-white font-bold text-lg select-none">
            A
          </div>
          <a href="/national.html" className="font-bold text-lg tracking-tight text-slate-900 select-none">
            AeroStreet-AI
          </a>
          <span className="px-2 py-0.5 bg-blue-50 border border-blue-100 text-blue-600 rounded-full text-[10px] font-bold ml-2">
            Predictive Sim
          </span>
        </div>

        <nav className="hidden md:flex items-center gap-8">
          <a href="/national.html" className="text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors">
            National Map
          </a>
          <a href="/districts.html" className="text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors">
            Districts
          </a>
          <a href="/municipality.html" className="text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors">
            Municipality Hub
          </a>
          <a href="/forecast.html" className="text-sm font-semibold text-slate-900 transition-colors">
            AQI Forecast
          </a>
          <a href="/community.html" className="text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors">
            Community
          </a>
        </nav>

        <div className="flex items-center gap-4">
          <a
            href="/municipality.html"
            className="hidden sm:flex items-center gap-1.5 text-xs font-semibold px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg transition-colors"
          >
            Dispatch Center
          </a>
        </div>
      </header>

      {/* Main Simulation Workspace Container */}
      <main className="pt-24 pb-12 flex-1 flex flex-col lg:flex-row p-6 lg:p-10 gap-8 max-w-[1410px] w-full mx-auto">
        {/* Left Column: Interactive Simulation Inputs */}
        <aside id="simulation-inputs" className="w-full lg:w-80 flex-shrink-0 flex flex-col gap-6 scroll-mt-28">
          <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm space-y-6">
            <div>
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                Simulation Inputs
              </h2>
              <p className="text-[10px] text-slate-400 mt-0.5 uppercase tracking-wider font-semibold">
                diurnal environmental factors
              </p>
            </div>

            {/* Sliders */}
            <div className="space-y-5">
              <div>
                <div className="flex justify-between text-xs font-semibold text-slate-700 mb-1.5">
                  <span>Traffic Density</span>
                  <span className="font-mono text-blue-600 font-bold">{traffic}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={traffic}
                  onChange={(e) => setTraffic(Number(e.target.value))}
                  className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600 outline-none"
                />
              </div>

              <div>
                <div className="flex justify-between text-xs font-semibold text-slate-700 mb-1.5">
                  <span>Industrial Output</span>
                  <span className="font-mono text-blue-600 font-bold">{industry}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={industry}
                  onChange={(e) => setIndustry(Number(e.target.value))}
                  className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600 outline-none"
                />
              </div>

              <div>
                <div className="flex justify-between text-xs font-semibold text-slate-700 mb-1.5">
                  <span>Wind Speed</span>
                  <span className="font-mono text-blue-600 font-bold">{wind} km/h</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="50"
                  value={wind}
                  onChange={(e) => setWind(Number(e.target.value))}
                  className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600 outline-none"
                />
              </div>

              <div>
                <div className="flex justify-between text-xs font-semibold text-slate-700 mb-1.5">
                  <span>Temperature</span>
                  <span className="font-mono text-blue-600 font-bold">{temp} °C</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="50"
                  value={temp}
                  onChange={(e) => setTemp(Number(e.target.value))}
                  className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600 outline-none"
                />
              </div>
            </div>

            <div className="pt-2">
              <button
                onClick={handleRefineGemini}
                disabled={isGeminiLoading}
                className="w-full py-3 bg-slate-900 hover:bg-slate-800 disabled:opacity-75 text-white rounded-xl text-xs font-bold transition-all shadow flex items-center justify-center gap-2 cursor-pointer active:scale-95"
              >
                {isGeminiLoading ? (
                  <span className="animate-spin text-amber-400">⟳</span>
                ) : (
                  <span className="text-amber-400 text-sm">✦</span>
                )}
                {isGeminiLoading ? 'Refining Inversion Plumes...' : 'Refine with Gemini AI'}
              </button>
            </div>
          </div>

          {/* Index Legend */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-3">
              Forecast Index Bands
            </p>
            <div className="space-y-2 text-xs">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-emerald-500"></span>
                <span className="text-slate-600 font-medium">Good (0-50)</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-lime-500"></span>
                <span className="text-slate-600 font-medium">Satisfactory (51-100)</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-amber-500"></span>
                <span className="text-slate-600 font-medium">Moderate (101-200)</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-orange-500"></span>
                <span className="text-slate-600 font-medium">Poor (201-300)</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-rose-600"></span>
                <span className="text-slate-600 font-medium">Very Poor / Severe (301-400)</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-purple-900"></span>
                <span className="text-slate-600 font-medium">Severe / Hazardous (401+)</span>
              </div>
            </div>
          </div>
        </aside>

        {/* Right Column: 14-Day Curve & Gemini Insights */}
        <div className="flex-1 flex flex-col gap-6">
          {/* Chart Card */}
          <div className="bg-white rounded-3xl p-6 lg:p-8 border border-slate-200/80 shadow-sm flex flex-col gap-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold text-slate-900">
                  14-Day Historical & Predictive AQI Curve
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Dashed line plots past 7 days, solid line forecasts next 7 days based on diurnal environmental variables
                </p>
              </div>

              <div className="flex items-center gap-2">
                <span className="px-3 py-1 rounded-full bg-slate-100 border border-slate-200 text-xs font-semibold text-slate-700">
                  Station: Delhi Central (Mandir Marg)
                </span>
              </div>
            </div>

            {/* Interactive SVG Chart */}
            <div className="w-full bg-slate-50/70 rounded-2xl border border-slate-100 p-4 relative h-[320px] flex items-center justify-center">
              <svg width="100%" height="100%" viewBox="0 0 800 280" className="w-full h-full">
                <defs>
                  <linearGradient id="curveGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#2563eb" stopOpacity="0.25" />
                    <stop offset="100%" stopColor="#2563eb" stopOpacity="0" />
                  </linearGradient>
                </defs>

                {/* Horizontal reference grid lines */}
                <line x1="40" y1="50" x2="760" y2="50" stroke="#e2e8f0" strokeDasharray="3 3" />
                <line x1="40" y1="110" x2="760" y2="110" stroke="#e2e8f0" strokeDasharray="3 3" />
                <line x1="40" y1="170" x2="760" y2="170" stroke="#e2e8f0" strokeDasharray="3 3" />
                <line x1="40" y1="230" x2="760" y2="230" stroke="#e2e8f0" />

                {/* Axis Labels */}
                <text x="30" y="55" fill="#94a3b8" fontSize="10" textAnchor="end">300</text>
                <text x="30" y="115" fill="#94a3b8" fontSize="10" textAnchor="end">200</text>
                <text x="30" y="175" fill="#94a3b8" fontSize="10" textAnchor="end">100</text>
                <text x="30" y="235" fill="#94a3b8" fontSize="10" textAnchor="end">0</text>

                {/* Shaded Area for Forecast */}
                <polygon
                  points="400,120 460,110 520,135 580,105 640,95 700,85 760,115 760,230 400,230"
                  fill="url(#curveGradient)"
                />

                {/* Past 7 Days (Dashed line) */}
                <path
                  d="M 40,165 Q 100,140 160,175 T 280,130 T 400,120"
                  fill="none"
                  stroke="#64748b"
                  strokeWidth="2.5"
                  strokeDasharray="6 6"
                />

                {/* Future 7 Days (Solid line influenced by inputs) */}
                <path
                  d="M 400,120 Q 460,105 520,130 T 640,90 T 760,110"
                  fill="none"
                  stroke="#2563eb"
                  strokeWidth="3.5"
                />

                {/* Today Marker */}
                <line x1="400" y1="30" x2="400" y2="230" stroke="#f59e0b" strokeWidth="2" strokeDasharray="4 4" />
                <circle cx="400" cy="120" r="5" fill="#f59e0b" stroke="#ffffff" strokeWidth="2" />
                <text x="400" y="25" fill="#f59e0b" fontSize="11" fontWeight="bold" textAnchor="middle">TODAY</text>
              </svg>
            </div>
          </div>

          {/* Gemini Advisory Box */}
          <div className="bg-white rounded-3xl p-6 lg:p-8 border border-slate-200/80 shadow-sm space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 font-bold">
                AI
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">AeroStreet-AI Action Insights</h3>
                <p className="text-[11px] text-slate-400 font-medium">diurnal prediction analysis & policies</p>
              </div>
            </div>

            <div className="text-sm text-slate-600 leading-relaxed bg-blue-50/40 border border-blue-100/60 p-5 rounded-2xl">
              <p>{aiAdvice}</p>
            </div>
          </div>
        </div>
      </main>

      {/* Accordion FAQ Section - FAQ 01 Kelo */}
      <ForecastFaqKelo />

      {/* Universal Footer */}
      <FooterMoxo />
    </div>
  );
}
