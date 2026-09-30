"use client";

import React, { useState } from "react";
import { Plus, Minus } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export interface FaqItem {
  id: number;
  question: string;
  answer: string;
}

export const FAQ_ITEMS: FaqItem[] = [
  {
    id: 1,
    question: "How does the 14-day predictive AQI model calculate future trends?",
    answer:
      "Our predictive engine combines past 7-day CPCB and IQAir telemetry with diurnal meteorological forecasting. It continuously calculates the interaction between vehicular traffic density, industrial baseline output, ambient temperature, and surface wind speed to model boundary-layer dispersion.",
  },
  {
    id: 2,
    question: "What happens when I adjust the environmental input sliders?",
    answer:
      "Adjusting traffic density, industrial output, wind speed, or temperature triggers a local heuristic recalculation of PM2.5 and PM10 accumulation rates. This dynamically updates the solid forecast curve for the next 7 days in real time.",
  },
  {
    id: 3,
    question: "How does 'Refine with Gemini AI' improve forecast accuracy?",
    answer:
      "Clicking 'Refine with Gemini AI' sends your calibrated environmental variables alongside regional satellite inversion data to Google Gemini 2.5. The model detects non-linear weather shifts (e.g., thermal inversions or biomass plume drift) and generates policy-grade municipal mitigation advisories.",
  },
  {
    id: 4,
    question: "Are the historical data points verified by official government monitors?",
    answer:
      "Yes. The dashed line representing the past 7 days is calibrated against official continuous ambient air quality monitoring stations (CAAQMS) operated by the Central Pollution Control Board (CPCB) and IQAir ground stations.",
  },
  {
    id: 5,
    question: "Can local municipal bodies use these forecasts for Graded Response Action Plans (GRAP)?",
    answer:
      "Yes. Urban local bodies and municipal dispatchers use the 72-hour and 7-day inversion curves to preemptively deploy anti-smog water mist canons, issue localized construction bans, and divert diesel transit corridors before critical thresholds are breached.",
  },
  {
    id: 6,
    question: "How frequently is the live station forecast synchronized?",
    answer:
      "Telemetry updates every 15 minutes across active monitoring stations in Delhi-NCR and major pan-India metropolitan clusters, recalculating atmospheric moisture and particulate stagnation curves automatically.",
  },
];

export const ForecastFaqKelo: React.FC = () => {
  const [openId, setOpenId] = useState<number | null>(1);

  const toggleAccordion = (id: number) => {
    setOpenId(openId === id ? null : id);
  };

  return (
    <section className="w-full bg-white py-20 px-6 md:px-12 lg:px-20 border-t border-gray-100">
      <div className="max-w-[1320px] mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-start">
          
          {/* Left Column: Heading and Action Buttons */}
          <div className="lg:col-span-5 flex flex-col items-start lg:sticky lg:top-28">
            <h2 className="text-4xl md:text-5xl lg:text-[54px] font-bold text-[#111827] leading-[1.15] tracking-tight mb-8">
              We're here to<br />
              answer<br />
              your questions..
            </h2>

            <div className="flex flex-wrap items-center gap-4">
              <a
                href="#simulation-inputs"
                className="bg-[#059669] hover:bg-[#047857] text-white px-8 py-3.5 rounded-full text-xs font-bold uppercase tracking-wider transition-all shadow-md hover:shadow-emerald-900/10 active:scale-95"
              >
                Run Simulator
              </a>
              <a
                href="/municipality.html"
                className="border border-[#059669] text-[#059669] hover:bg-[#059669]/10 px-8 py-3.5 rounded-full text-xs font-bold uppercase tracking-wider transition-all active:scale-95"
              >
                View Dispatch Hub
              </a>
            </div>
          </div>

          {/* Right Column: Accordion Questions */}
          <div className="lg:col-span-7 flex flex-col divide-y divide-gray-200">
            {FAQ_ITEMS.map((item) => {
              const isOpen = openId === item.id;

              return (
                <div key={item.id} className="py-6 first:pt-0 last:pb-0">
                  <button
                    onClick={() => toggleAccordion(item.id)}
                    className="w-full flex items-center justify-between text-left group py-2 focus:outline-none cursor-pointer"
                    aria-expanded={isOpen}
                  >
                    <span className="text-lg md:text-xl font-semibold text-[#111827] group-hover:text-[#059669] transition-colors pr-6">
                      {item.question}
                    </span>
                    <span className="text-gray-500 group-hover:text-[#059669] transition-colors flex-shrink-0">
                      {isOpen ? (
                        <Minus className="stroke-[2.5]" size={22} />
                      ) : (
                        <Plus className="stroke-[2.5]" size={22} />
                      )}
                    </span>
                  </button>

                  <AnimatePresence initial={false}>
                    {isOpen && (
                      <motion.div
                        key="content"
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.3, ease: "easeInOut" }}
                        className="overflow-hidden"
                      >
                        <p className="text-base text-gray-600 leading-relaxed pt-3 pb-2 pr-6">
                          {item.answer}
                        </p>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>

        </div>
      </div>
    </section>
  );
};

export default ForecastFaqKelo;
