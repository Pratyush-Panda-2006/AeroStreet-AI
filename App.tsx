import React, { useState, useEffect } from 'react';
import AboutUsMoxo from './components/AboutUsMoxo';
import FooterMoxo from './components/FooterMoxo';

/**
 * 1. Global Assets & Typography Setup Reference
 * Liquid Glass Utility Class (add to global CSS):
 * .liquid-glass {
 *   background: rgba(0, 0, 0, 0.4);
 *   background-blend-mode: luminosity;
 *   backdrop-filter: blur(4px);
 *   -webkit-backdrop-filter: blur(4px);
 *   border: none;
 *   box-shadow: inset 0 1px 1px rgba(255, 255, 255, 0.1);
 *   position: relative;
 *   overflow: hidden;
 * }
 * .liquid-glass::before {
 *   content: '';
 *   position: absolute;
 *   inset: 0;
 *   border-radius: inherit;
 *   padding: 1.4px;
 *   background: linear-gradient(
 *     180deg,
 *     rgba(255,255,255,0.3) 0%, rgba(255,255,255,0.1) 20%,
 *     rgba(255,255,255,0) 40%, rgba(255,255,255,0) 60%,
 *     rgba(255,255,255,0.1) 80%, rgba(255,255,255,0.3) 100%
 *   );
 *   -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
 *   -webkit-mask-composite: xor;
 *   mask-composite: exclude;
 *   pointer-events: none;
 * }
 */

// ============================================
// 2. Animation Logic & Micro-Components
// ============================================

export interface FadeInProps {
  delay?: number;
  duration?: number;
  children: React.ReactNode;
  className?: string;
}

export const FadeIn: React.FC<FadeInProps> = ({
  delay = 0,
  duration = 1000,
  children,
  className = '',
}) => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setVisible(true);
    }, delay);
    return () => clearTimeout(timer);
  }, [delay]);

  return (
    <div
      className={className}
      style={{
        opacity: visible ? 1 : 0,
        transition: `opacity ${duration}ms cubic-bezier(0.16, 1, 0.3, 1)`,
      }}
    >
      {children}
    </div>
  );
};

export interface AnimatedHeadingProps {
  text: string;
  className?: string;
}

export const AnimatedHeading: React.FC<AnimatedHeadingProps> = ({
  text,
  className = '',
}) => {
  const [animated, setAnimated] = useState(false);
  const lines = text.split('\n');
  const globalStartDelay = 200; // ms
  const charDuration = 500; // ms

  useEffect(() => {
    const timer = setTimeout(() => {
      setAnimated(true);
    }, globalStartDelay);
    return () => clearTimeout(timer);
  }, []);

  return (
    <h1
      className={`font-normal ${className}`}
      style={{ letterSpacing: '-0.04em' }}
    >
      {lines.map((line, lineIndex) => {
        const words = line.split(' ');
        let runningCharCount = 0;

        return (
          <span key={lineIndex} className="block">
            {words.map((word, wordIndex) => {
              const wordStartCharIndex = runningCharCount;
              runningCharCount += word.length + 1;

              return (
                <React.Fragment key={wordIndex}>
                  <span className="inline-block whitespace-nowrap">
                    {Array.from(word).map((char, charIdx) => {
                      const charDelay =
                        lineIndex * line.length * 30 +
                        (wordStartCharIndex + charIdx) * 30;
                      return (
                        <span
                          key={charIdx}
                          className="inline-block"
                          style={{
                            opacity: animated ? 1 : 0,
                            transform: animated
                              ? 'translateX(0px)'
                              : 'translateX(-18px)',
                            transition: `opacity ${charDuration}ms cubic-bezier(0.16, 1, 0.3, 1) ${charDelay}ms, transform ${charDuration}ms cubic-bezier(0.16, 1, 0.3, 1) ${charDelay}ms`,
                          }}
                        >
                          {char}
                        </span>
                      );
                    })}
                  </span>
                  {wordIndex < words.length - 1 && (
                    <span
                      className="inline-block"
                      style={{
                        opacity: animated ? 1 : 0,
                        transition: `opacity ${charDuration}ms cubic-bezier(0.16, 1, 0.3, 1) ${
                          lineIndex * line.length * 30 +
                          (wordStartCharIndex + word.length) * 30
                        }ms`,
                      }}
                    >
                      &nbsp;
                    </span>
                  )}
                </React.Fragment>
              );
            })}
          </span>
        );
      })}
    </h1>
  );
};

// ============================================
// 3. Hero & Navigation Architecture
// ============================================

export default function App() {
  const handleQuickReport = () => {
    // Triggers existing AeroStreet-AI quick report modal
    const modalTrigger = document.getElementById('nav-report-btn');
    if (modalTrigger && typeof (window as any).showReportModal === 'function') {
      (window as any).showReportModal();
    } else {
      const event = new CustomEvent('aerostreet:open-report-modal');
      window.dispatchEvent(event);
    }
  };

  const handleReportViolation = () => {
    // Triggers existing violation photo report modal
    const heroReportBtn = document.getElementById('hero-report-btn');
    if (heroReportBtn && typeof (window as any).showReportModal === 'function') {
      (window as any).showReportModal();
    } else {
      const event = new CustomEvent('aerostreet:open-report-modal');
      window.dispatchEvent(event);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-black text-white font-sans antialiased">
      {/* Full-viewport Hero Container */}
      <section className="relative w-full h-screen overflow-hidden bg-black flex flex-col">
        {/* Background Video: Zero overlay, zero dimming */}
        <video
          autoPlay
          loop
          muted
          playsInline
          className="absolute inset-0 w-full h-full object-cover z-0 pointer-events-none"
          src="https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260403_050628_c4e32401-fab4-4a27-b7a8-6e9291cd5959.mp4"
        />

        {/* Floating Navbar */}
        <div className="relative z-10 w-full pt-6 px-6 md:px-12 lg:px-16">
          <header className="liquid-glass rounded-xl px-4 py-2 flex items-center justify-between">
            {/* Left: Brand wordmark with leading indicator block */}
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-white/10 border border-white/20 flex items-center justify-center text-white font-bold text-base select-none backdrop-blur-sm">
                I
              </div>
              <a
                href="/national.html"
                className="text-2xl font-semibold tracking-tight text-white select-none"
              >
                AeroStreet-AI
              </a>
            </div>

            {/* Center (hidden on mobile, flex on md+): Links mapped to AeroStreet pages */}
            <nav className="hidden md:flex items-center gap-8">
              <a
                href="/national.html"
                className="text-sm text-white transition hover:text-gray-300 font-medium"
              >
                National Map
              </a>
              <a
                href="/districts.html"
                className="text-sm text-white transition hover:text-gray-300 font-medium"
              >
                Districts
              </a>
              <a
                href="/municipality.html"
                className="text-sm text-white transition hover:text-gray-300 font-medium"
              >
                Municipality Hub
              </a>
              <a
                href="/forecast.html"
                className="text-sm text-white transition hover:text-gray-300 font-medium"
              >
                AQI Forecast
              </a>
              <a
                href="/community.html"
                id="nav-community-link"
                className="text-sm text-white transition hover:text-gray-300 font-medium"
              >
                Community
              </a>
            </nav>

            {/* Right: Action button "Quick Report" */}
            <div className="flex items-center gap-4">
              <button
                id="nav-report-btn"
                onClick={handleQuickReport}
                className="bg-white text-black px-6 py-2 rounded-lg text-sm font-medium hover:bg-gray-100 transition"
              >
                Quick Report
              </button>
              <img
                alt="user profile avatar"
                id="user-avatar"
                className="w-8 h-8 rounded-full border border-white/20 object-cover cursor-pointer hidden"
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuAq0NM-3MIfoLB0WYgeMarhquCFzUBTCG3997CleBO-PGN_WtYpT1lpfuBFOzr_jd8AWbUCZ0Jqg0U_3oLAImWndwjJCJt9m2aVwEAoRCaMTezxG0JNJygEdN_N_2EY36cOCD1CRil6Gfh7s_nnpCtKSvgCprI7taiXZXkfT8J-Y6EjoVVCdoXOfdRYQSWk4SfXcJDsMbJaDulJjZVGo9j6fNetMPh2pFAAvWmsQEFoVnhvAZB-hKTCbGVYSsx6t4LtS84p6oyHjrI"
              />
            </div>
          </header>
        </div>

        {/* Bottom Hero Content Container */}
        <div className="relative z-10 w-full flex-1 flex flex-col justify-end px-6 md:px-12 lg:px-16 pb-12 lg:pb-16">
          <div className="w-full max-w-4xl">
            {/* Status Badge */}
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/10 text-xs text-white mb-4">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              Live Monitoring Active — Version 2.5
            </div>

            {/* Main Heading */}
            <AnimatedHeading
              text={'Spotting and Fixing Local\nPollution Hotspots.'}
              className="text-4xl md:text-5xl lg:text-6xl xl:text-7xl mb-4 text-white"
            />

            {/* Subheading */}
            <FadeIn delay={800} duration={1000}>
              <p className="text-base md:text-lg text-gray-300 mb-5 max-w-xl">
                Deploying high-performance air quality tracking, real-time citizen
                reporting, and automated AI command models across India's
                cities and states.
              </p>
            </FadeIn>

            {/* Button Row */}
            <FadeIn delay={1200} duration={1000}>
              <div className="flex flex-wrap items-center gap-4">
                <a
                  href="#national-explorer"
                  className="bg-white text-black px-8 py-3 rounded-lg font-medium transition hover:bg-gray-100 inline-flex items-center gap-2"
                >
                  Explore Live Map &rarr;
                </a>
                <button
                  id="hero-report-btn"
                  onClick={handleReportViolation}
                  className="liquid-glass border border-white/20 text-white px-8 py-3 rounded-lg font-medium transition duration-300 hover:bg-white hover:text-black"
                >
                  Report Violation
                </button>
              </div>
            </FadeIn>
          </div>
        </div>
      </section>

      {/* About Us 05 Moxo Section */}
      <AboutUsMoxo />

      {/* Preservation of National Interactive Explorer Anchor */}
      <div id="national-explorer" />

      {/* Footer o1 Moxo Editorial Dark Footer */}
      <FooterMoxo />
    </div>
  );
}
