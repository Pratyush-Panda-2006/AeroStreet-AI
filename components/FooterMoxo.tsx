"use client";

import React from 'react';
import { Instagram, Facebook, Youtube, Music2 } from 'lucide-react';

export const FooterMoxo: React.FC = () => {
  return (
    <section
      className="w-full bg-[#0a0b0a] text-[#ECEDED] p-8"
      style={{ fontFamily: "'Inter', sans-serif" }}
    >
      {/* Scoped Google Fonts */}
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link
        rel="preconnect"
        href="https://fonts.gstatic.com"
        crossOrigin="anonymous"
      />
      <link
        href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Playfair+Display:wght@400;700&display=swap"
        rel="stylesheet"
      />

      <footer className="max-w-[1312px] mx-auto">
        {/* 1. Top CTA Banner */}
        <div className="relative w-full h-[450px] rounded-[32px] overflow-hidden mb-20 group">
          <img
            src="https://images.unsplash.com/photo-1509316975850-ff9c5deb0cd9?auto=format&fit=crop&q=80&w=1920"
            alt="Clear skies over Indian urban landscape"
            referrerPolicy="no-referrer"
            className="absolute inset-0 w-full h-full object-cover transition-transform duration-1000 group-hover:scale-105"
          />
          <div className="absolute inset-0 bg-black/40 flex flex-col items-center justify-center text-center p-8">
            <h2
              className="text-4xl md:text-6xl lg:text-7xl text-white mb-10 max-w-4xl leading-tight"
              style={{ fontFamily: "'Playfair Display', serif" }}
            >
              Restoring clean air to our cities, one neighborhood at a time.
            </h2>
            <div className="flex flex-col sm:flex-row gap-5">
              <a
                href="/national.html"
                className="bg-[#F97317] hover:bg-[#EB580C] text-white px-10 py-4 rounded-full font-semibold transition-all duration-300 shadow-lg hover:shadow-[#F97317]/20 flex items-center justify-center"
              >
                Report a Violation →
              </a>
              <a
                href="/municipality.html"
                className="bg-[#FABE24] hover:bg-[#EB580C] hover:text-white text-neutral-900 px-10 py-4 rounded-full font-semibold transition-all duration-300 shadow-lg flex items-center justify-center"
              >
                Access Command Hub
              </a>
            </div>
          </div>
        </div>

        {/* 2. Footer Content Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 mb-24">
          {/* Column 1 — Municipal Operations & Telemetry */}
          <div className="lg:col-span-2 space-y-6 text-[#BFBFBE] text-lg">
            <h3 className="text-white font-bold mb-8 uppercase tracking-[0.2em] text-xs">
              MUNICIPAL OPERATIONS & TELEMETRY
            </h3>
            <p className="leading-relaxed">
              AeroStreet-AI Command Center<br />
              Central Pollution Intelligence Cell, CPCB Complex<br />
              East Arjun Nagar, Delhi 110032
            </p>
            <p className="text-white font-medium text-xl">
              1800-180-AERO (2376)
            </p>
            <div>
              <a
                href="mailto:telemetry@aerostreet.ai"
                className="text-white hover:text-[#FABE24] transition-colors cursor-pointer block"
              >
                telemetry@aerostreet.ai
              </a>
              <span className="text-sm italic opacity-50 block mt-1">
                (Real-time CPCB, IQAir &amp; automated CCTV ingestion active)
              </span>
            </div>
          </div>

          {/* Column 2 — Platform Hubs */}
          <div>
            <h3 className="text-white font-bold mb-8 uppercase tracking-[0.2em] text-xs">
              PLATFORM HUBS
            </h3>
            <ul className="space-y-4 text-[#BFBFBE]">
              <li>
                <a
                  href="/national.html"
                  className="hover:text-[#FABE24] transition-colors duration-300 text-lg block"
                >
                  National AQI Explorer
                </a>
              </li>
              <li>
                <a
                  href="/districts.html"
                  className="hover:text-[#FABE24] transition-colors duration-300 text-lg block"
                >
                  District Hotspots
                </a>
              </li>
              <li>
                <a
                  href="/municipality.html"
                  className="hover:text-[#FABE24] transition-colors duration-300 text-lg block"
                >
                  Municipality Console
                </a>
              </li>
              <li>
                <a
                  href="/forecast.html"
                  className="hover:text-[#FABE24] transition-colors duration-300 text-lg block"
                >
                  72-Hour Inversion Forecast
                </a>
              </li>
              <li>
                <a
                  href="/community.html"
                  className="hover:text-[#FABE24] transition-colors duration-300 text-lg block"
                >
                  Citizen Reporting Feed
                </a>
              </li>
              <li>
                <a
                  href="/national.html#analytics"
                  className="hover:text-[#FABE24] transition-colors duration-300 text-lg block"
                >
                  Gemini 2.5 Mitigation Insights
                </a>
              </li>
            </ul>
          </div>

          {/* Column 3 — Governance & Standards */}
          <div>
            <h3 className="text-white font-bold mb-8 uppercase tracking-[0.2em] text-xs">
              GOVERNANCE & DATA
            </h3>
            <ul className="space-y-4 text-[#BFBFBE]">
              <li>
                <a
                  href="#"
                  className="hover:text-[#FABE24] transition-colors duration-300 text-lg block"
                >
                  CPCB AQI Calibration
                </a>
              </li>
              <li>
                <a
                  href="#"
                  className="hover:text-[#FABE24] transition-colors duration-300 text-lg block"
                >
                  Camera Webhook Integration
                </a>
              </li>
              <li>
                <a
                  href="#"
                  className="hover:text-[#FABE24] transition-colors duration-300 text-lg block"
                >
                  Sensor Network Logs
                </a>
              </li>
              <li>
                <a
                  href="#"
                  className="hover:text-[#FABE24] transition-colors duration-300 text-lg block"
                >
                  Enforcement Transparency
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* 3. Bottom Bar */}
        <div className="pt-12 border-t border-white/10 flex flex-col md:flex-row items-center justify-between gap-8">
          {/* Logo Group */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[#F97317] rounded-xl flex items-center justify-center transform rotate-3 shadow-md">
              <span className="text-white font-bold text-2xl">A</span>
            </div>
            <span
              className="text-white text-3xl font-bold tracking-tight"
              style={{ fontFamily: "'Playfair Display', serif" }}
            >
              AeroStreet-AI
            </span>
          </div>

          {/* Social Icons */}
          <div className="flex items-center gap-8">
            <a
              href="#"
              aria-label="Instagram"
              className="text-[#BFBFBE] hover:text-[#FABE24] transition-all duration-300 hover:scale-110"
            >
              <Instagram size={22} />
            </a>
            <a
              href="#"
              aria-label="Facebook"
              className="text-[#BFBFBE] hover:text-[#FABE24] transition-all duration-300 hover:scale-110"
            >
              <Facebook size={22} />
            </a>
            <a
              href="#"
              aria-label="Music"
              className="text-[#BFBFBE] hover:text-[#FABE24] transition-all duration-300 hover:scale-110"
            >
              <Music2 size={22} />
            </a>
            <a
              href="#"
              aria-label="YouTube"
              className="text-[#BFBFBE] hover:text-[#FABE24] transition-all duration-300 hover:scale-110"
            >
              <Youtube size={22} />
            </a>
          </div>
        </div>

        {/* 4. Copyright Row */}
        <div className="mt-12 text-center text-[#BFBFBE]/30 text-xs">
          © {new Date().getFullYear()} AeroStreet-AI Platform. Built for cleaner skies and transparent municipal governance. All rights reserved.
        </div>
      </footer>
    </section>
  );
};

export default FooterMoxo;
