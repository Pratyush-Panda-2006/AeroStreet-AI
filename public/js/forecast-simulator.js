// ============================================
// AeroStreet-AI — 14-Day AQI Forecast Simulator
// ============================================

import { getAQILevel } from './config.js';

let baselineAqi = 210; // Default Delhi Central average
let historicalData = [185, 198, 220, 205, 190, 235, 215]; // Last 7 days
let forecastData = [225, 230, 245, 260, 250, 240, 230];   // Simulated next 7 days

// Dates array builder
const dateLabels = [];
const today = new Date();

// Last 7 days
for (let i = 7; i > 0; i--) {
  const d = new Date(today);
  d.setDate(today.getDate() - i);
  dateLabels.push({
    dateStr: d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }),
    type: 'Historical'
  });
}
// Today
dateLabels.push({
  dateStr: today.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) + ' (Today)',
  type: 'Historical'
});
// Next 7 days
for (let i = 1; i <= 7; i++) {
  const d = new Date(today);
  d.setDate(today.getDate() + i);
  dateLabels.push({
    dateStr: d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }),
    type: 'Simulated Forecast'
  });
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    setTimeout(initForecastSimulatorPage, 100);
  });
} else {
  // DOM already loaded (module scripts are deferred)
  setTimeout(initForecastSimulatorPage, 100);
}

function initForecastSimulatorPage() {
  console.log('[ForecastSimulator] Init Page');

  const trafficSlider = document.getElementById('slider-traffic');
  const industrySlider = document.getElementById('slider-industry');
  const windSlider = document.getElementById('slider-wind');
  const tempSlider = document.getElementById('slider-temp');
  const refineBtn = document.getElementById('trigger-gemini-prediction');

  if (!trafficSlider) return;

  // Bind Slider Value Displays
  const updateDisplays = () => {
    document.getElementById('val-traffic').textContent = `${trafficSlider.value}%`;
    document.getElementById('val-industry').textContent = `${industrySlider.value}%`;
    document.getElementById('val-wind').textContent = `${windSlider.value} km/h`;
    document.getElementById('val-temp').textContent = `${tempSlider.value} °C`;
  };

  const handleSliderChange = () => {
    updateDisplays();
    calculateLocalForecast();
    draw14DayChart();
  };

  [trafficSlider, industrySlider, windSlider, tempSlider].forEach(slider => {
    slider.addEventListener('input', handleSliderChange);
  });

  // Refine with Gemini AI Click Handler
  if (refineBtn) {
    refineBtn.addEventListener('click', async () => {
      refineBtn.disabled = true;
      refineBtn.innerHTML = `
        <span class="material-symbols-outlined text-[16px] animate-spin">progress_activity</span>
        Computing AI Models...
      `;

      try {
        const response = await fetch('/api/gemini-forecast-insights', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            traffic: parseInt(trafficSlider.value),
            industry: parseInt(industrySlider.value),
            wind: parseInt(windSlider.value),
            temp: parseInt(tempSlider.value),
            baseline: baselineAqi
          })
        });

        if (!response.ok) throw new Error('API request failed');
        const result = await response.json();

        if (result.success && result.forecast) {
          forecastData = result.forecast;
          
          const insightsDiv = document.getElementById('forecast-ai-insights');
          if (insightsDiv && result.insights) {
            insightsDiv.innerHTML = `
              <div class="flex gap-2">
                <span class="material-symbols-outlined text-amber-500 text-[18px]">verified</span>
                <div>
                  <p class="font-bold text-slate-800">Gemini Prediction Alert</p>
                  <p class="mt-1">${result.insights}</p>
                </div>
              </div>
            `;
          }
          
          window.__aerostreet?.showToast?.('Forecast models updated using Gemini AI!', 'success');
          draw14DayChart();
        }
      } catch (err) {
        console.error('[ForecastSimulator] Gemini sync failed:', err);
        window.__aerostreet?.showToast?.('AI forecast refinement failed. Kept heuristic models.', 'warning');
      } finally {
        refineBtn.disabled = false;
        refineBtn.innerHTML = `
          <span class="material-symbols-outlined text-[16px] text-amber-400">psychology</span>
          Refine with Gemini AI
        `;
      }
    });
  }

  // Initial Draw
  updateDisplays();
  calculateLocalForecast();
  draw14DayChart();
}

/**
 * Heuristic prediction model (Frontend math algorithm)
 */
function calculateLocalForecast() {
  const traffic = parseInt(document.getElementById('slider-traffic').value);
  const industry = parseInt(document.getElementById('slider-industry').value);
  const wind = parseInt(document.getElementById('slider-wind').value);
  const temp = parseInt(document.getElementById('slider-temp').value);

  // Compute 7 days of values progressively influenced by factors
  const computed = [];
  for (let day = 1; day <= 7; day++) {
    // Basic regression algorithm modeling pollution stacking
    let change = (traffic - 50) * 1.2 + (industry - 40) * 1.8 - (wind - 12) * 2.8 + (temp - 28) * 0.5;
    
    // Add progressive decay or buildup noise
    let accumulation = (day * (change * 0.15));
    let base = historicalData[historicalData.length - 1]; // start from today's value
    
    let aqiVal = Math.round(base + change + accumulation);
    computed.push(Math.max(10, Math.min(500, aqiVal)));
  }
  forecastData = computed;

  // Local Insights Generator
  const insightsDiv = document.getElementById('forecast-ai-insights');
  if (insightsDiv) {
    const avgForecast = Math.round(computed.reduce((s,v) => s+v, 0) / 7);
    const level = getAQILevel(avgForecast);
    
    let advice = 'Inputs suggest normal atmospheric operations. No emergency restrictions required.';
    if (avgForecast > 300) {
      advice = '🔴 CRITICAL ADVISORY: Predicted Severe AQI. Recommend municipal ban on construction, deployment of anti-smog water sprinklers, and odd-even traffic rules.';
    } else if (avgForecast > 150) {
      advice = '🟠 MODERATE WARNING: Stacking particulate density detected. High industrial outputs coupled with low wind speeds are impeding dispersion. Recommend active watering of arterial roads.';
    }
    
    insightsDiv.innerHTML = `
      <div class="space-y-1">
        <p class="font-bold text-slate-800">Heuristic Advisory (Responsive Simulation):</p>
        <p>Predicted 7-Day Average AQI is <strong class="text-${level.bgClass.replace('bg-', '')}">${avgForecast} (${level.label})</strong>. ${advice}</p>
        <p class="text-[10px] text-slate-400 mt-1 italic">Click "Refine with Gemini AI" to sync these variables with the LLM forecast analyzer.</p>
      </div>
    `;
  }
}

/**
 * Render 14-Day interactive SVG line chart (combining 7-day past history + 7-day prediction)
 */
function draw14DayChart() {
  const svg = document.getElementById('forecast-svg-chart');
  if (!svg) return;

  // Clear previous content
  svg.innerHTML = '';

  const container = document.getElementById('chart-viewport');
  const width = container ? container.clientWidth - 32 : 800;  // subtract padding
  const height = container ? container.clientHeight - 32 : 288;

  // Set explicit viewBox so SVG scales properly
  svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
  svg.setAttribute('width', width);
  svg.setAttribute('height', height);

  const paddingLeft = 40;
  const paddingRight = 30;
  const paddingTop = 30;
  const paddingBottom = 40;

  const chartWidth = width - paddingLeft - paddingRight;
  const chartHeight = height - paddingTop - paddingBottom;

  // Total points: 15 (7 days historical + Today + 7 days forecast)
  const fullData = [...historicalData, forecastData[0], ...forecastData];
  
  const minVal = 0;
  const maxVal = Math.max(300, ...fullData) + 40;
  const range = maxVal - minVal;

  const getX = (idx) => paddingLeft + (idx / 14) * chartWidth;
  const getY = (val) => paddingTop + chartHeight - ((val - minVal) / range) * chartHeight;

  const svgNS = "http://www.w3.org/2000/svg";

  // Re-create gradient defs (they get cleared with innerHTML)
  const defs = document.createElementNS(svgNS, "defs");
  defs.innerHTML = `
    <linearGradient id="chart-area-grad" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#3b82f6" stop-opacity="0.15" />
      <stop offset="100%" stop-color="#3b82f6" stop-opacity="0" />
    </linearGradient>
  `;
  svg.appendChild(defs);

  // 1. Draw horizontal gridlines and y-axis labels
  const steps = 4;
  for (let i = 0; i <= steps; i++) {
    const val = Math.round(minVal + (i / steps) * range);
    const y = getY(val);

    // Gridline
    const line = document.createElementNS(svgNS, "line");
    line.setAttribute("x1", paddingLeft);
    line.setAttribute("y1", y);
    line.setAttribute("x2", width - paddingRight);
    line.setAttribute("y2", y);
    line.setAttribute("stroke", "#f1f5f9");
    line.setAttribute("stroke-width", "1");
    svg.appendChild(line);

    // Label
    const txt = document.createElementNS(svgNS, "text");
    txt.setAttribute("x", paddingLeft - 8);
    txt.setAttribute("y", y + 4);
    txt.setAttribute("text-anchor", "end");
    txt.setAttribute("fill", "#94a3b8");
    txt.setAttribute("font-size", "9px");
    txt.setAttribute("font-family", "monospace");
    txt.textContent = val;
    svg.appendChild(txt);
  }

  // 2. Demarcation line (Today marker)
  const todayIdx = 7;
  const todayX = getX(todayIdx);

  const todayLine = document.createElementNS(svgNS, "line");
  todayLine.setAttribute("x1", todayX);
  todayLine.setAttribute("y1", paddingTop);
  todayLine.setAttribute("x2", todayX);
  todayLine.setAttribute("y2", height - paddingBottom);
  todayLine.setAttribute("stroke", "#3b82f6");
  todayLine.setAttribute("stroke-width", "1.5");
  todayLine.setAttribute("stroke-dasharray", "4 4");
  svg.appendChild(todayLine);

  const todayText = document.createElementNS(svgNS, "text");
  todayText.setAttribute("x", todayX);
  todayText.setAttribute("y", paddingTop - 8);
  todayText.setAttribute("text-anchor", "middle");
  todayText.setAttribute("fill", "#2563eb");
  todayText.setAttribute("font-size", "9px");
  todayText.setAttribute("font-weight", "bold");
  todayText.textContent = "TODAY";
  svg.appendChild(todayText);

  // 3. Render Historical Path (Dashed Blue Line, indexes 0 to 7)
  let histPoints = [];
  for (let i = 0; i <= todayIdx; i++) {
    histPoints.push(`${getX(i)},${getY(fullData[i])}`);
  }
  const histPath = document.createElementNS(svgNS, "path");
  histPath.setAttribute("d", `M ${histPoints.join(' L ')}`);
  histPath.setAttribute("fill", "none");
  histPath.setAttribute("stroke", "#64748b");
  histPath.setAttribute("stroke-width", "2.5");
  histPath.setAttribute("stroke-dasharray", "5 5");
  svg.appendChild(histPath);

  // 4. Render Forecast Path (Solid blue line, indexes 7 to 14)
  let forePoints = [];
  for (let i = todayIdx; i < 15; i++) {
    forePoints.push(`${getX(i)},${getY(fullData[i])}`);
  }
  const forePath = document.createElementNS(svgNS, "path");
  forePath.setAttribute("d", `M ${forePoints.join(' L ')}`);
  forePath.setAttribute("fill", "none");
  forePath.setAttribute("stroke", "#2563eb");
  forePath.setAttribute("stroke-width", "3");
  svg.appendChild(forePath);

  // Area filling for forecast section
  const areaPoints = [
    `${getX(todayIdx)},${getY(0)}`,
    ...forePoints,
    `${getX(14)},${getY(0)}`
  ];
  const foreArea = document.createElementNS(svgNS, "path");
  foreArea.setAttribute("d", `M ${areaPoints.join(' L ')} Z`);
  foreArea.setAttribute("fill", "url(#chart-area-grad)");
  svg.appendChild(foreArea);

  // 5. Draw data points circles & hover trackers
  fullData.forEach((val, idx) => {
    const cx = getX(idx);
    const cy = getY(val);
    const level = getAQILevel(val);

    // Inner Circle Core
    const circle = document.createElementNS(svgNS, "circle");
    circle.setAttribute("cx", cx);
    circle.setAttribute("cy", cy);
    circle.setAttribute("r", idx === todayIdx ? "5" : "3.5");
    circle.setAttribute("fill", level.color);
    circle.setAttribute("stroke", "#ffffff");
    circle.setAttribute("stroke-width", "1.5");
    circle.setAttribute("class", "chart-dot transition-all");
    circle.style.cursor = "pointer";
    svg.appendChild(circle);

    // Invisible Interactive Circle for easier hovering
    const trigger = document.createElementNS(svgNS, "circle");
    trigger.setAttribute("cx", cx);
    trigger.setAttribute("cy", cy);
    trigger.setAttribute("r", "16");
    trigger.setAttribute("fill", "transparent");
    trigger.style.cursor = "pointer";

    trigger.addEventListener('mouseenter', (e) => {
      circle.setAttribute("r", "7");
      showChartTooltip(e, idx, val);
    });
    trigger.addEventListener('mouseleave', () => {
      circle.setAttribute("r", idx === todayIdx ? "5" : "3.5");
      hideChartTooltip();
    });

    svg.appendChild(trigger);
  });

  // 6. Draw X-axis labels
  fullData.forEach((val, idx) => {
    // Only label odd indexes to avoid overlapping on smaller displays
    if (idx % 2 === 0 || idx === todayIdx) {
      const cx = getX(idx);
      const label = dateLabels[idx];

      const txt = document.createElementNS(svgNS, "text");
      txt.setAttribute("x", cx);
      txt.setAttribute("y", height - paddingBottom + 16);
      txt.setAttribute("text-anchor", "middle");
      txt.setAttribute("fill", idx === todayIdx ? "#2563eb" : "#64748b");
      txt.setAttribute("font-size", "9px");
      txt.setAttribute("font-weight", idx === todayIdx ? "bold" : "normal");
      txt.textContent = label.dateStr.replace(' (Today)', '');
      svg.appendChild(txt);
    }
  });
}

function showChartTooltip(e, idx, val) {
  let tooltip = document.getElementById('chart-hover-tooltip');
  if (!tooltip) {
    tooltip = document.createElement('div');
    tooltip.id = 'chart-hover-tooltip';
    tooltip.className = 'fixed z-[999] pointer-events-none p-3 rounded-xl border border-slate-200 bg-white/95 backdrop-blur-md shadow-xl text-slate-700 text-xs font-sans transition-opacity duration-150 opacity-0';
    document.body.appendChild(tooltip);
  }

  const label = dateLabels[idx];
  const level = getAQILevel(val);

  tooltip.innerHTML = `
    <div class="font-bold text-slate-900">${label.dateStr}</div>
    <div class="text-[10px] text-slate-400 font-medium uppercase mt-0.5">${label.type}</div>
    <div class="flex items-center gap-1.5 mt-2 pt-1 border-t border-slate-100">
      <span class="w-2.5 h-2.5 rounded-full" style="background: ${level.color}"></span>
      <span class="font-bold text-slate-700">AQI ${val}</span>
      <span class="text-[10px] uppercase font-bold text-slate-400 font-mono">(${level.label})</span>
    </div>
  `;

  tooltip.style.opacity = '1';

  // Position tooltip
  const rect = tooltip.getBoundingClientRect();
  tooltip.style.left = `${e.clientX + 12}px`;
  tooltip.style.top = `${e.clientY - rect.height - 8}px`;
}

function hideChartTooltip() {
  const tooltip = document.getElementById('chart-hover-tooltip');
  if (tooltip) {
    tooltip.style.opacity = '0';
  }
}
