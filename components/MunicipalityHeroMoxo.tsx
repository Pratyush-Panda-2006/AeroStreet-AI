"use client";

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, Menu, X, Plus } from 'lucide-react';

export const MunicipalityHeroMoxo: React.FC = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const handleQuickReport = () => {
    if (typeof (window as any).showReportModal === 'function') {
      (window as any).showReportModal();
    } else {
      const btn = document.getElementById('nav-report-btn');
      if (btn) btn.click();
    }
  };

  const handleDispatchNotice = () => {
    const bulkPanel = document.getElementById('bulk-actions-panel');
    if (bulkPanel) {
      bulkPanel.classList.remove('hidden');
      bulkPanel.scrollIntoView({ behavior: 'smooth' });
    } else {
      const target = document.getElementById('operations-log');
      if (target) target.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <section
      className="w-full bg-white font-inter"
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
        href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Bricolage+Grotesque:wght@400;500;600;700;800&display=swap"
        rel="stylesheet"
      />

      {/* 1. Header & Navigation */}
      <header className="w-full max-w-[1410px] mx-auto px-6 py-6 flex items-center justify-between">
        {/* Brand Logo (Left) */}
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-[#1c3e31] flex items-center justify-center text-white font-bold text-lg shadow-sm">
            A
          </div>
          <a
            href="/national.html"
            className="text-2xl font-bold tracking-tight text-[#131313] select-none"
          >
            AeroStreet-AI
          </a>
          <span className="px-2 py-0.5 bg-[#d2eac3] text-[#1c3e31] rounded-full text-[11px] font-bold tracking-wide uppercase ml-1">
            MUNICIPALITY
          </span>
        </div>

        {/* Desktop Nav Links (Center, hidden lg:flex) */}
        <nav className="hidden lg:flex items-center gap-10">
          <a
            href="/national.html"
            className="text-[15px] font-medium text-[#131313] hover:text-[#254c3d] transition-colors"
          >
            National Map
          </a>
          <a
            href="/districts.html"
            className="text-[15px] font-medium text-[#131313] hover:text-[#254c3d] transition-colors"
          >
            Districts
          </a>
          <a
            href="/municipality.html"
            className="text-[15px] font-medium text-[#131313] hover:text-[#254c3d] transition-colors"
          >
            Municipality Hub
          </a>
          <a
            href="/forecast.html"
            className="text-[15px] font-medium text-[#131313] hover:text-[#254c3d] transition-colors"
          >
            AQI Forecast
          </a>
          <a
            href="/community.html"
            className="text-[15px] font-medium text-[#131313] hover:text-[#254c3d] transition-colors"
          >
            Community
          </a>
        </nav>

        {/* Desktop Actions (Right, hidden md:flex) */}
        <div className="hidden md:flex items-center gap-3">
          <button
            onClick={handleDispatchNotice}
            className="px-6 py-3 rounded-full bg-[#d2eac3] text-[#1c3e31] font-semibold text-[15px] hover:bg-[#c5e2b0] transition-all active:scale-95 cursor-pointer"
          >
            Dispatch Notice
          </button>
          <button
            onClick={handleQuickReport}
            className="px-6 py-3 rounded-full bg-[#1c3e31] text-white font-semibold text-[15px] flex items-center gap-2 hover:bg-[#143127] transition-all active:scale-95 group cursor-pointer"
          >
            Quick Report
            <ArrowRight
              size={18}
              className="group-hover:translate-x-1 transition-transform"
            />
          </button>
        </div>

        {/* Mobile Menu Toggle (lg:hidden) */}
        <button
          onClick={() => setIsMenuOpen(!isMenuOpen)}
          className="lg:hidden p-2 text-[#1c3e31] cursor-pointer"
          aria-label="Toggle navigation menu"
        >
          {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </header>

      {/* 2. Mobile Dropdown Menu */}
      <AnimatePresence>
        {isMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="lg:hidden bg-white border-b border-gray-100 px-6 py-8 overflow-hidden"
          >
            <div className="flex flex-col gap-6 text-lg font-medium text-[#131313] mb-8">
              <a
                href="/national.html"
                onClick={() => setIsMenuOpen(false)}
                className="hover:text-[#254c3d] transition-colors"
              >
                National Map
              </a>
              <a
                href="/districts.html"
                onClick={() => setIsMenuOpen(false)}
                className="hover:text-[#254c3d] transition-colors"
              >
                Districts
              </a>
              <a
                href="/municipality.html"
                onClick={() => setIsMenuOpen(false)}
                className="hover:text-[#254c3d] transition-colors"
              >
                Municipality Hub
              </a>
              <a
                href="/forecast.html"
                onClick={() => setIsMenuOpen(false)}
                className="hover:text-[#254c3d] transition-colors"
              >
                AQI Forecast
              </a>
              <a
                href="/community.html"
                onClick={() => setIsMenuOpen(false)}
                className="hover:text-[#254c3d] transition-colors"
              >
                Community
              </a>
            </div>

            <div className="flex flex-col gap-3">
              <button
                onClick={() => {
                  setIsMenuOpen(false);
                  handleDispatchNotice();
                }}
                className="w-full py-3.5 rounded-full bg-[#d2eac3] text-[#1c3e31] font-semibold text-center hover:bg-[#c5e2b0] transition-colors"
              >
                Dispatch Notice
              </button>
              <button
                onClick={() => {
                  setIsMenuOpen(false);
                  handleQuickReport();
                }}
                className="w-full py-3.5 rounded-full bg-[#1c3e31] text-white font-semibold text-center flex items-center justify-center gap-2 hover:bg-[#143127] transition-colors"
              >
                Quick Report
                <ArrowRight size={18} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 3. Hero Visual Container */}
      <div className="px-4 md:px-10 pb-10">
        <div className="relative w-full max-w-[1410px] mx-auto h-[600px] md:h-[720px] rounded-[32px] overflow-hidden group">
          {/* Background Image */}
          <img
            src="https://cdn.jiro.build/Sumon/Hero%205.png"
            alt="Municipal Field Officers and Clean Air Action"
            referrerPolicy="no-referrer"
            className="absolute inset-0 w-full h-full object-cover transition-transform duration-1000 group-hover:scale-105"
          />

          {/* Dark Gradient Overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent" />

          {/* Decorative Plus Icons Layer */}
          <div className="absolute inset-0 pointer-events-none opacity-30 text-white">
            <Plus size={20} className="absolute top-1/4 left-1/4" />
            <Plus size={16} className="absolute top-1/3 left-1/2" />
            <Plus size={24} className="absolute top-1/2 left-1/3" />
            <Plus size={18} className="absolute top-2/3 left-2/3" />
            <Plus size={22} className="absolute top-1/4 left-3/4" />
          </div>

          {/* Bottom Hero Content Wrapper */}
          <div className="relative z-10 w-full h-full flex flex-col md:flex-row items-end justify-between p-8 md:p-16 lg:p-20">
            {/* Left Content */}
            <motion.div
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8 }}
              className="max-w-[680px] flex flex-col gap-6"
            >
              <h1
                className="text-[48px] md:text-[64px] lg:text-[72px] font-bold text-white leading-[1.1] tracking-tight"
                style={{ fontFamily: "'Bricolage Grotesque', sans-serif" }}
              >
                Rapid Action,
                <br />
                Zero Smog.
              </h1>
              <p className="text-lg md:text-xl text-white/90 leading-relaxed max-w-[540px]">
                Empowering city municipal teams with automated CCTV hotspot
                spotting, real-time CPCB telemetry, and instant enforcement
                dispatch workflows.
              </p>
            </motion.div>

            {/* Right Content / Civic Officer Highlight */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.4 }}
              className="mt-10 md:mt-0 flex flex-col items-center md:items-end gap-6"
            >
              {/* Officer Avatars Cluster */}
              <div className="flex flex-col items-center md:items-end gap-2">
                <div className="flex -space-x-3">
                  <img
                    src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=100&auto=format&fit=crop"
                    alt="Responder 1"
                    referrerPolicy="no-referrer"
                    className="w-12 h-12 rounded-full border-2 border-white object-cover"
                  />
                  <img
                    src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=100&auto=format&fit=crop"
                    alt="Responder 2"
                    referrerPolicy="no-referrer"
                    className="w-12 h-12 rounded-full border-2 border-white object-cover"
                  />
                  <img
                    src="https://images.unsplash.com/photo-1500648767791-00dcc994a43e?q=80&w=100&auto=format&fit=crop"
                    alt="Responder 3"
                    referrerPolicy="no-referrer"
                    className="w-12 h-12 rounded-full border-2 border-white object-cover"
                  />
                  <img
                    src="https://images.unsplash.com/photo-1438761681033-6461ffad8d80?q=80&w=100&auto=format&fit=crop"
                    alt="Responder 4"
                    referrerPolicy="no-referrer"
                    className="w-12 h-12 rounded-full border-2 border-white object-cover"
                  />
                </div>
                <span className="text-white font-medium text-base">
                  Active municipal responders on duty
                </span>
              </div>

              {/* Primary CTA Button */}
              <a
                href="#operations-log"
                className="px-8 py-4 rounded-full bg-[#1c3e31] text-white font-bold text-lg flex items-center gap-2 hover:bg-[#143127] transition-all active:scale-95 group shadow-2xl"
              >
                Manage Active Incidents
                <ArrowRight
                  size={22}
                  className="group-hover:translate-x-1 transition-transform"
                />
              </a>
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default MunicipalityHeroMoxo;
