import React from 'react';
import MunicipalityHeroMoxo from './components/MunicipalityHeroMoxo';
import FooterMoxo from './components/FooterMoxo';

export default function Municipality() {
  return (
    <div className="min-h-screen bg-white text-slate-800 antialiased flex flex-col font-sans">
      {/* Hero 05 Moxo Header and Hero for Municipality Hub */}
      <MunicipalityHeroMoxo />

      {/* Main Workspace Container */}
      <main className="max-w-[1410px] mx-auto w-full px-6 py-10 flex flex-col lg:flex-row gap-8">
        {/* Left Column: Metrics, Policies, Simulator, Heatmap, and Operations Log */}
        <div className="flex-1 space-y-8">
          {/* Command Header + Statistics Cards */}
          <div>
            <h2 className="text-3xl font-bold tracking-tight text-slate-900 mb-6">
              Municipality Control Center
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6">
              {/* Card 1: Pending Incidents */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Pending Incidents
                  </p>
                  <p id="muni-kpi-pending" className="text-3xl font-bold text-slate-900 mt-1">
                    6
                  </p>
                  <p className="text-[10px] text-slate-400 mt-0.5">4 reported today</p>
                </div>
                <div className="w-10 h-10 rounded-lg bg-red-50 border border-red-100 flex items-center justify-center text-red-600 font-bold">
                  !
                </div>
              </div>

              {/* Card 2: CCTV Alerts */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    CCTV Alerts
                  </p>
                  <p id="muni-kpi-cctv" className="text-3xl font-bold text-slate-900 mt-1">
                    2
                  </p>
                  <p className="text-[10px] text-slate-400 mt-0.5">AI automated spotting</p>
                </div>
                <div className="w-10 h-10 rounded-lg bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 font-bold">
                  CAM
                </div>
              </div>

              {/* Card 3: Resolved Index */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Resolved Index
                  </p>
                  <p id="muni-kpi-resolved" className="text-3xl font-bold text-slate-900 mt-1">
                    23
                  </p>
                  <p className="text-[10px] text-slate-400 mt-0.5">↑ 15% this week</p>
                </div>
                <div className="w-10 h-10 rounded-lg bg-green-50 border border-green-100 flex items-center justify-center text-green-600 font-bold">
                  ✓
                </div>
              </div>

              {/* Card 4: RSVP Volunteers */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    RSVP Volunteers
                  </p>
                  <p id="muni-kpi-volunteers" className="text-3xl font-bold text-slate-900 mt-1">
                    124
                  </p>
                  <p className="text-[10px] text-slate-400 mt-0.5">Across 3 active drives</p>
                </div>
                <div className="w-10 h-10 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-600 font-bold">
                  👥
                </div>
              </div>

              {/* Card 5: Mandir Marg Live Station */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Live WAQI Station
                  </p>
                  <p id="muni-kpi-waqi" className="text-3xl font-bold text-amber-600 mt-1">
                    159
                  </p>
                  <p id="muni-kpi-waqi-name" className="text-[10px] text-slate-400 mt-0.5 truncate max-w-[120px]">
                    Mandir Marg, Delhi
                  </p>
                </div>
                <div className="w-10 h-10 rounded-lg bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-600 font-bold">
                  AQI
                </div>
              </div>
            </div>
          </div>

          {/* AI-Powered 24-Hour AQI Forecast Simulator */}
          <div className="p-6 bg-slate-50 border border-slate-200 rounded-2xl space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-slate-900 text-base">
                  AI-Powered 24-Hour AQI Forecast Simulator
                </h3>
                <p className="text-xs text-slate-400">
                  Simulate environmental variables to predict 24hr regional air quality trends
                </p>
              </div>
              <span className="px-2.5 py-1 bg-[#1c3e31]/10 text-[#1c3e31] border border-[#1c3e31]/20 rounded-full text-[10px] font-bold uppercase tracking-wider">
                Predictive ML Engine
              </span>
            </div>
          </div>

          {/* Delhi District Local Pollution Heatmap */}
          <div className="border border-slate-200 rounded-2xl overflow-hidden bg-white">
            <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <h3 className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
                Delhi District Local Pollution Heatmap
              </h3>
              <span className="px-2 py-0.5 bg-green-50 border border-green-100 text-green-700 rounded-full text-[10px] font-bold">
                Live Density
              </span>
            </div>
            <div id="pollution-heatmap-container" className="w-full h-64 bg-slate-100 flex items-center justify-center text-slate-400">
              Interactive Heatmap Canvas
            </div>
          </div>

          {/* System Operations & Incident Log Table */}
          <div id="operations-log" className="border border-slate-200 rounded-2xl overflow-hidden bg-white scroll-mt-8">
            <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <h3 className="font-bold text-slate-900 text-sm">
                System Operations & Incident Log
              </h3>
              <span className="px-2 py-0.5 bg-blue-50 border border-blue-100 text-blue-700 rounded-full text-[10px] font-bold">
                Real-time sync
              </span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-[10px] uppercase font-bold tracking-wider text-slate-400">
                    <th className="p-3">Source/ID</th>
                    <th className="p-3">Event Type</th>
                    <th className="p-3">Details / Location</th>
                    <th className="p-3">Status</th>
                  </tr>
                </thead>
                <tbody id="incident-log-body" className="divide-y divide-slate-100">
                  <tr className="hover:bg-slate-50">
                    <td className="p-3 font-mono font-medium">CAM-A14</td>
                    <td className="p-3 text-red-600 font-semibold">Industrial Emission Spike</td>
                    <td className="p-3">Anand Vihar CAM-A14</td>
                    <td className="p-3"><span className="px-2 py-0.5 rounded bg-amber-100 text-amber-800 font-medium text-[10px]">Under Review</span></td>
                  </tr>
                  <tr className="hover:bg-slate-50">
                    <td className="p-3 font-mono font-medium">CIT-882</td>
                    <td className="p-3 text-amber-600 font-semibold">Construction Dust Plume</td>
                    <td className="p-3">Dwarka Sector 21</td>
                    <td className="p-3"><span className="px-2 py-0.5 rounded bg-blue-100 text-blue-800 font-medium text-[10px]">Dispatched</span></td>
                  </tr>
                  <tr className="hover:bg-slate-50">
                    <td className="p-3 font-mono font-medium">CIT-891</td>
                    <td className="p-3 text-red-600 font-semibold">Open Waste Incineration</td>
                    <td className="p-3">Okhla Phase III</td>
                    <td className="p-3"><span className="px-2 py-0.5 rounded bg-red-100 text-red-800 font-medium text-[10px]">Critical</span></td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Right Column: AI Action Insights Sidebar */}
        <aside className="w-full lg:w-[380px] bg-slate-50 border border-slate-200 rounded-2xl p-6 space-y-6 h-fit">
          <div className="border-b border-slate-200 pb-4">
            <h3 className="font-bold text-slate-900 text-lg">AI Action Insights</h3>
            <p className="text-xs text-slate-400">Gemini-powered municipal recommendations</p>
          </div>
          <div id="ai-recommendations" className="space-y-4">
            <div className="p-4 bg-white border border-slate-200 rounded-xl">
              <span className="text-xs font-bold text-[#1c3e31] uppercase">Advisory</span>
              <p className="text-xs text-slate-600 mt-1">
                Deploy misting cannons along Anand Vihar corridor during 18:00–21:00 peak stagnation.
              </p>
            </div>
          </div>
        </aside>
      </main>

      {/* Editorial Dark Footer */}
      <FooterMoxo />
    </div>
  );
}
