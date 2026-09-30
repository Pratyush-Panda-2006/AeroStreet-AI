import React from 'react';
import { motion } from 'framer-motion';

export const AboutUsMoxo: React.FC = () => {
  const stats = [
    { number: '3,240+', label: 'Active telemetry sensors' },
    { number: '94.5%', label: 'CCTV detection accuracy' },
    { number: '1,120+', label: 'Violations resolved' },
    { number: '15.8%', label: 'Average AQI reduction' },
  ];

  return (
    <section
      className="w-full bg-white text-[#111827] py-[80px] px-6 md:px-[70px] relative"
      style={{ fontFamily: "'DM Sans', sans-serif" }}
    >
      <div className="max-w-[1200px] mx-auto">
        {/* Row 1 — Header */}
        <div className="flex flex-col md:flex-row justify-between items-start mb-16 gap-8">
          {/* Pill Badge */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="flex items-center gap-2 px-[14px] py-[6px] bg-black/5 border border-black/10 rounded-full"
          >
            <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
            <span className="text-[13px] text-gray-700 font-medium">About us</span>
          </motion.div>

          {/* Headline */}
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="text-[32px] md:text-[42px] font-[800] text-[#111827] leading-[1.2] md:w-[70%] text-left md:text-right ml-auto"
            style={{ fontFamily: "'Bricolage Grotesque', sans-serif" }}
          >
            From real-time sensor grids to AI-powered surveillance for municipal action{' '}
            <br className="hidden md:block" />
            to spotting and fixing pollution hotspots across India.
          </motion.h2>
        </div>

        {/* Row 2 — Stats Bar */}
        <div className="grid grid-cols-2 md:grid-cols-4 w-full mb-20 border-y border-[#e5e7eb] py-10">
          {stats.map((stat, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              className="flex flex-col px-4 md:px-10"
              style={{
                borderRight: index < 3 ? '1px solid #e5e7eb' : 'none',
              }}
            >
              <div className="text-[32px] md:text-[42px] font-[700] text-[#111827] leading-tight">
                {stat.number}
              </div>
              <div className="text-[13px] text-[#6b7280] font-medium mt-1">
                {stat.label}
              </div>
            </motion.div>
          ))}
        </div>

        {/* Row 3 — Three Feature Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-[20px]">
          {/* Card 1 — Dark Green Impact */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0 }}
            className="h-[350px] bg-[#254C3D] rounded-[24px] p-[28px] flex flex-col justify-between"
          >
            {/* Top row */}
            <div className="flex justify-between items-start">
              <div className="w-[52px] h-[52px] bg-white rounded-full flex items-center justify-center shadow-sm">
                <svg
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="#254C3D"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path d="M12 22C16.4183 22 20 18.4183 20 14C20 8 12 2 12 2C12 2 4 8 4 14C4 18.4183 7.58172 22 12 22Z" />
                </svg>
              </div>
              <div className="text-[42px] md:text-[48px] font-[800] text-white leading-none">
                36 States
              </div>
            </div>

            {/* Bottom row */}
            <div className="flex flex-col gap-1">
              <span className="text-[13px] text-white/80 font-medium">
                + 12 regional critical hotspot corridors
              </span>
              <p className="text-[18px] text-white leading-snug">
                Up to <strong className="font-bold">90%</strong> of flagged air spikes <br />
                trigger direct municipal dispatches.
              </p>
            </div>
          </motion.div>

          {/* Card 2 — Photo Card */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="h-[350px] rounded-[24px] overflow-hidden relative group"
          >
            <img
              src="https://images.unsplash.com/photo-1488521787991-ed7bbaae773c?q=80&w=2070&auto=format&fit=crop"
              alt="Clean Air Community Outreach"
              referrerPolicy="no-referrer"
              className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

            {/* Bottom content */}
            <div className="absolute bottom-0 left-0 right-0 p-6 flex flex-col">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-[14px]">⭐</span>
                <span className="text-[14px] font-bold text-white">
                  Trusted by 500+ local urban bodies
                </span>
              </div>
              <div className="text-[52px] font-[800] text-white leading-none">
                25,000+
              </div>
              <span className="text-[15px] font-[500] text-white/90 mt-1">
                Citizens actively reporting hotspots
              </span>
            </div>
          </motion.div>

          {/* Card 3 — Dark Green Telemetry & Action */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="h-[350px] bg-[#254C3D] rounded-[24px] p-[28px] flex flex-col justify-between"
          >
            {/* Top row */}
            <div className="flex justify-between items-start">
              <div className="text-[42px] md:text-[48px] font-[800] text-white leading-none">
                85%
              </div>
              <div className="w-[48px] h-[48px] bg-white rounded-full flex items-center justify-center shadow-sm">
                <svg
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M12 3V21M3 12H21M5.63604 5.63604L18.364 18.364M18.364 5.63604L5.63604 18.364"
                    stroke="#254C3D"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                  />
                </svg>
              </div>
            </div>

            {/* Bottom block */}
            <div className="flex flex-col gap-4">
              <div>
                <div className="text-[16px] font-[700] text-white mb-1">
                  Automated Spotting CCTV
                </div>
                <div className="text-[13px] text-white/70">
                  + 120 municipal command hubs served
                </div>
              </div>

              <div className="flex gap-2">
                <a
                  href="/forecast.html"
                  className="px-5 py-2.5 bg-white border-[1.5px] border-white/20 rounded-full text-[13px] font-bold text-[#254C3D] hover:bg-white/90 transition-colors"
                >
                  View Forecast
                </a>
                <a
                  href="/community.html"
                  className="px-5 py-2.5 bg-transparent border-[1.5px] border-white/40 rounded-full text-[13px] font-bold text-white hover:bg-white/10 transition-colors"
                >
                  Initiatives
                </a>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default AboutUsMoxo;
